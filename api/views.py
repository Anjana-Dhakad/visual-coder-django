from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

from tree_sitter import Parser, Language
from tree_sitter_c import language as c_language_func

# --- Views to render HTML pages ---
def index(request):
    return render(request, 'index.html')

def code_to_flowchart_view(request):
    return render(request, 'code-to-flowchart.html')

# api/views.py

def flowchart_to_code_view(request):
    return render(request, 'flowchart-to-code.html')

# --- API Code ---
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
            y_pos += 120
            return node

        def create_edge(source, target, label=''):
            edge_id = f"e-{source}-{target}-{label}-{get_unique_node_id()}"
            return {'id': edge_id, 'source': source, 'target': target, 'label': label, 'type': 'smoothstep'}

        def walk_ast(node, parent_id, x_pos=350, break_target_id=None):
            current_parent_id = parent_id

            if not node or not hasattr(node, 'children'):
                return current_parent_id

            for child in node.named_children:
                child_text = child.text.decode('utf8')

                if child.type in ('expression_statement', 'declaration', 'return_statement'):
                    created_node = create_node('inputOutput', child_text, x_pos, y_pos)
                    nodes.append(created_node)
                    edges.append(create_edge(current_parent_id, created_node['id']))
                    current_parent_id = created_node['id']
                
                elif child.type == 'if_statement':
                    condition = child.child_by_field_name('condition').text.decode('utf8')
                    if_node = create_node('decision', f"{condition}", x_pos, y_pos)
                    nodes.append(if_node)
                    edges.append(create_edge(current_parent_id, if_node['id']))
                    
                    merge_node = create_node('inputOutput', '', x_pos, y_pos + 240)
                    nodes.append(merge_node)

                    consequence = child.child_by_field_name('consequence')
                    true_end_id = walk_ast(consequence, if_node['id'], x_pos - 200, merge_node['id'])
                    edges.append(create_edge(if_node['id'], true_end_id, 'True'))
                    if true_end_id != merge_node['id']:
                       edges.append(create_edge(true_end_id, merge_node['id']))
                    
                    alternative = child.child_by_field_name('alternative')
                    if alternative:
                        false_end_id = walk_ast(alternative, if_node['id'], x_pos + 200, merge_node['id'])
                        edges.append(create_edge(if_node['id'], false_end_id, 'False'))
                        if false_end_id != merge_node['id']:
                            edges.append(create_edge(false_end_id, merge_node['id']))
                    else:
                        edges.append(create_edge(if_node['id'], merge_node['id'], 'False'))
                    
                    current_parent_id = merge_node['id']
                
                # ===============================================================
                #  FOR LOOP LOGIC (FIXED)
                # ===============================================================
                elif child.type == 'for_statement':
                    initializer = child.child_by_field_name('initializer')
                    init_text = initializer.text.decode('utf8') if initializer else ''
                    init_node = create_node('inputOutput', init_text, x_pos, y_pos)
                    nodes.append(init_node)
                    edges.append(create_edge(current_parent_id, init_node['id']))

                    condition = child.child_by_field_name('condition')
                    cond_text = condition.text.decode('utf8') if condition else 'true'
                    cond_node = create_node('decision', cond_text, x_pos, y_pos)
                    nodes.append(cond_node)
                    edges.append(create_edge(init_node['id'], cond_node['id']))
                    
                    body_node = child.child_by_field_name('body')
                    # Recursively process the loop body
                    body_end_id = walk_ast(body_node, cond_node['id'], x_pos, None)
                    edges.append(create_edge(cond_node['id'], body_end_id, 'True'))
                    
                    update = child.child_by_field_name('update')
                    update_text = update.text.decode('utf8') if update else ''
                    update_node = create_node('inputOutput', update_text, x_pos, y_pos)
                    nodes.append(update_node)
                    edges.append(create_edge(body_end_id, update_node['id']))
                    
                    # This is the crucial part: loop back to the condition
                    edges.append(create_edge(update_node['id'], cond_node['id']))

                    # The next statement will connect from the 'False' branch of the condition
                    current_parent_id = cond_node['id']

                elif child.type == 'while_statement':
                    condition = child.child_by_field_name('condition')
                    cond_text = condition.text.decode('utf8') if condition else 'true'
                    cond_node = create_node('decision', cond_text, x_pos, y_pos)
                    nodes.append(cond_node)
                    edges.append(create_edge(current_parent_id, cond_node['id']))

                    body = child.child_by_field_name('body')
                    body_end_id = walk_ast(body, cond_node['id'], x_pos + 250)
                    edges.append(create_edge(cond_node['id'], body_end_id, 'True'))
                    edges.append(create_edge(body_end_id, cond_node['id']))
                    
                    current_parent_id = cond_node['id']

                else:
                    current_parent_id = walk_ast(child, current_parent_id, x_pos, break_target_id)

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
        
        last_node_id = start_node['id']
        if main_function_body:
            last_node_id = walk_ast(main_function_body, start_node['id'])
        else:
            last_node_id = walk_ast(root_node, start_node['id'])

        end_node = create_node('startEnd', 'End', 350, y_pos)
        nodes.append(end_node)
        
        # Connect the last node to the end node
        # For loops, the last node is the condition, so connect its 'False' branch to the end
        if nodes[-2]['type'] == 'decision': # If the last generated node was a decision (like in a loop)
            edges.append(create_edge(last_node_id, end_node['id'], 'False'))
        else:
            edges.append(create_edge(last_node_id, end_node['id']))

        return JsonResponse({'status': 'success', 'nodes': nodes, 'edges': edges})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)