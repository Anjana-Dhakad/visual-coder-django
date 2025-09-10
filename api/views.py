from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

from tree_sitter import Parser, Language
from tree_sitter_c import language as c_language_func

node_id_counter = 1

def get_unique_node_id():
    global node_id_counter
    res = f"node-{node_id_counter}"
    node_id_counter += 1
    return res

@csrf_exempt
def generate_flowchart(request):
    global node_id_counter
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)

    try:
        data = json.loads(request.body)
        code = data.get('code', '')
        if not code:
            return JsonResponse({'status': 'error', 'message': 'Code cannot be empty'}, status=400)

        parser = Parser()
        c_lang = Language(c_language_func())
        parser.language = c_lang

        tree = parser.parse(bytes(code, "utf8"))
        root_node = tree.root_node

        nodes = []
        edges = []
        node_id_counter = 1
        y_pos = 50

        def create_node(node_type, label, x, y, extra_data={}):
            nonlocal y_pos
            node_id = get_unique_node_id()
            node = {
                'id': node_id,
                'type': node_type,
                'position': {'x': x, 'y': y},
                'data': {'label': label, **extra_data}
            }
            y_pos += 100
            return node

        def create_edge(source, target, label=''):
            edge_id = f"e-{source}-{target}-{label}-{get_unique_node_id()}"
            return {'id': edge_id, 'source': source, 'target': target, 'label': label}

        def walk_ast(node, parent_id, x_pos=350):
            current_parent_id = parent_id

            if not node or not hasattr(node, 'named_children'):
                return parent_id

            for child in node.named_children:
                created_node = None
                child_text = child.text.decode('utf8')

                if child.type in ('declaration', 'expression_statement', 'return_statement'):
                    created_node = create_node('inputOutput', child_text, x_pos, y_pos)
                
                elif child.type == 'if_statement':
                    condition = child.child_by_field_name('condition').text.decode('utf8')
                    created_node = create_node('decision', f"{condition}", x_pos, y_pos)
                    nodes.append(created_node)
                    # --- BADLAV: .id ki jagah ['id'] ka istemal ---
                    edges.append(create_edge(current_parent_id, created_node['id']))
                    
                    consequence = child.child_by_field_name('consequence')
                    # --- BADLAV: .id ki jagah ['id'] ka istemal ---
                    true_end_id = walk_ast(consequence, created_node['id'], x_pos - 200)

                    merge_node = create_node('inputOutput', '', x_pos, y_pos)
                    merge_node['data']['label'] = ''
                    nodes.append(merge_node)
                    # --- BADLAV: .id ki jagah ['id'] ka istemal ---
                    edges.append(create_edge(true_end_id, merge_node['id'], 'True'))
                    
                    alternative = child.child_by_field_name('alternative')
                    if alternative:
                        # --- BADLAV: .id ki jagah ['id'] ka istemal ---
                        false_end_id = walk_ast(alternative, created_node['id'], x_pos + 200)
                        # --- BADLAV: .id ki jagah ['id'] ka istemal ---
                        edges.append(create_edge(false_end_id, merge_node['id'], 'False'))
                    else:
                        # --- BADLAV: .id ki jagah ['id'] ka istemal ---
                        edges.append(create_edge(created_node['id'], merge_node['id'], 'False'))
                    
                    # --- BADLAV: .id ki jagah ['id'] ka istemal ---
                    current_parent_id = merge_node['id']
                    continue
                
                if created_node:
                    nodes.append(created_node)
                    # --- BADLAV: .id ki jagah ['id'] ka istemal ---
                    edges.append(create_edge(current_parent_id, created_node['id']))
                    # --- BADLAV: .id ki jagah ['id'] ka istemal ---
                    current_parent_id = created_node['id']
                else:
                    current_parent_id = walk_ast(child, current_parent_id, x_pos)

            return current_parent_id

        start_node = create_node('startEnd', 'Start', 350, y_pos)
        nodes.append(start_node)
        
        main_function_body = None
        for func in root_node.children:
            if func.type == 'function_definition':
                declarator = func.child_by_field_name('declarator')
                if declarator and 'main' in declarator.text.decode('utf8'):
                    main_function_body = func.child_by_field_name('body')
                    break
        
        # --- BADLAV: .id ki jagah ['id'] ka istemal ---
        last_node_id = start_node['id']
        if main_function_body:
            # --- BADLAV: .id ki jagah ['id'] ka istemal ---
            last_node_id = walk_ast(main_function_body, start_node['id'])
        else:
            # --- BADLAV: .id ki jagah ['id'] ka istemal ---
            last_node_id = walk_ast(root_node, start_node['id'])

        end_node = create_node('startEnd', 'End', 350, y_pos)
        nodes.append(end_node)
        edges.append(create_edge(last_node_id, end_node['id']))

        return JsonResponse({'status': 'success', 'nodes': nodes, 'edges': edges})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)