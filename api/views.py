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
def generate_code_from_flowchart(request):
    """
    Generate C code from flowchart data (react-flow nodes and edges).
    Expects JSON payload with 'nodes' and 'edges' arrays.
    """
    if request.method != 'POST':
        return JsonResponse({'status': 'error', 'message': 'Invalid request method'}, status=405)
    
    try:
        data = json.loads(request.body)
        nodes = data.get('nodes', [])
        edges = data.get('edges', [])
        
        if not nodes:
            return JsonResponse({'status': 'error', 'message': 'No nodes provided'}, status=400)
        
        # Find the Start node
        start_node = None
        for node in nodes:
            if node.get('data', {}).get('label', '').lower() == 'start':
                start_node = node
                break
        
        if not start_node:
            return JsonResponse({'code': '// Error: "Start" node not found!'})
        
        # Build adjacency list
        adj = {}
        for node in nodes:
            adj[node['id']] = []
        
        for edge in edges:
            if edge['source'] in adj:
                adj[edge['source']].append({
                    'target': edge['target'],
                    'label': edge.get('label', '')
                })
        
        def get_node(node_id):
            for node in nodes:
                if node['id'] == node_id:
                    return node
            return None
        
        def format_statement(label, indentation):
            indent = '  ' * indentation
            trimmed_label = label.strip()
            if not trimmed_label:
                return ''
            if trimmed_label.endswith(';') or trimmed_label.endswith('{') or trimmed_label.endswith('}'):
                return f"{indent}{trimmed_label}\n"
            return f"{indent}{trimmed_label};\n"
        
        def find_merge_node(decision_node_id, local_adj, local_edges):
            """Find the merge point for if-else branches"""
            decision_neighbors = local_adj.get(decision_node_id, [])
            true_edge = None
            false_edge = None
            
            for edge in decision_neighbors:
                if edge['label'].lower() == 'true':
                    true_edge = edge
                elif edge['label'].lower() == 'false':
                    false_edge = edge
            
            if not true_edge:
                return false_edge['target'] if false_edge else None
            
            # Follow true path and collect all nodes
            true_path = set()
            curr = true_edge['target']
            while curr:
                true_path.add(curr)
                next_edges = local_adj.get(curr, [])
                incoming_edges = [e for e in local_edges if e['target'] == curr]
                if len(next_edges) == 0 or len(incoming_edges) > 1:
                    break
                curr = next_edges[0]['target']
            
            # Follow false path and find first intersection with true path
            curr = false_edge['target'] if false_edge else None
            while curr:
                if curr in true_path:
                    return curr
                next_edges = local_adj.get(curr, [])
                incoming_edges = [e for e in local_edges if e['target'] == curr]
                if len(next_edges) == 0 or len(incoming_edges) > 1:
                    break
                curr = next_edges[0]['target']
            
            return None
        
        def is_while_loop(decision_node_id):
            """Check if a decision node is part of a while loop"""
            decision_neighbors = adj.get(decision_node_id, [])
            true_edge = None
            
            for edge in decision_neighbors:
                if edge['label'].lower() == 'true':
                    true_edge = edge
                    break
            
            if not true_edge:
                return False
            
            # Follow the true path and see if it loops back to the decision node
            current_node_id = true_edge['target']
            path = set()
            
            while current_node_id and current_node_id not in path:
                path.add(current_node_id)
                if current_node_id == decision_node_id:
                    return True
                neighbors = adj.get(current_node_id, [])
                if len(neighbors) != 1:
                    return False
                current_node_id = neighbors[0]['target']
            
            return False
        
        # Generate C code
        code = '#include <stdio.h>\n\nint main() {\n'
        current_node_id = start_node['id']
        visited = set()
        
        while current_node_id and current_node_id not in visited:
            visited.add(current_node_id)
            node = get_node(current_node_id)
            
            if not node or node.get('data', {}).get('label', '').lower() == 'end':
                break
            
            neighbors = adj.get(node['id'], [])
            node_type = node.get('type', '')
            node_label = node.get('data', {}).get('label', '')
            
            if node_type == 'startEnd' and node_label.lower() == 'start':
                current_node_id = neighbors[0]['target'] if neighbors else None
            
            elif node_type == 'inputOutput':
                code += format_statement(node_label, 1)
                current_node_id = neighbors[0]['target'] if neighbors else None
            
            elif node_type == 'forLoop':
                indent = '  '
                code += f"{indent}for ({node_label}) {{\n"
                
                # Find true and false edges
                true_edge = None
                false_edge = None
                for edge in neighbors:
                    if edge['label'].lower() == 'true':
                        true_edge = edge
                    elif edge['label'].lower() == 'false':
                        false_edge = edge
                
                # Process loop body
                if true_edge:
                    body_node_id = true_edge['target']
                    loop_exit_id = false_edge['target'] if false_edge else None
                    loop_body_path = set()
                    
                    while (body_node_id and body_node_id != node['id'] and 
                           body_node_id != loop_exit_id and body_node_id not in loop_body_path):
                        loop_body_path.add(body_node_id)
                        body_node = get_node(body_node_id)
                        if body_node:
                            code += format_statement(body_node.get('data', {}).get('label', ''), 2)
                        
                        body_neighbors = adj.get(body_node_id, [])
                        body_node_id = body_neighbors[0]['target'] if body_neighbors else None
                
                code += f"{indent}}}\n"
                current_node_id = false_edge['target'] if false_edge else None
            
            elif node_type == 'decision':
                if is_while_loop(node['id']):
                    # Handle while loop
                    indent = '  '
                    code += f"{indent}while ({node_label}) {{\n"
                    
                    true_edge = None
                    false_edge = None
                    for edge in neighbors:
                        if edge['label'].lower() == 'true':
                            true_edge = edge
                        elif edge['label'].lower() == 'false':
                            false_edge = edge
                    
                    if true_edge:
                        body_node_id = true_edge['target']
                        while body_node_id and body_node_id != node['id']:
                            body_node = get_node(body_node_id)
                            if body_node:
                                code += format_statement(body_node.get('data', {}).get('label', ''), 2)
                            
                            body_neighbors = adj.get(body_node_id, [])
                            body_node_id = body_neighbors[0]['target'] if body_neighbors else None
                    
                    code += f"{indent}}}\n"
                    current_node_id = false_edge['target'] if false_edge else None
                
                else:
                    # Handle if-else
                    merge_node_id = find_merge_node(node['id'], adj, edges)
                    indent = '  '
                    code += f"{indent}if ({node_label}) {{\n"
                    
                    # Process true branch
                    true_edge = None
                    false_edge = None
                    for edge in neighbors:
                        if edge['label'].lower() == 'true':
                            true_edge = edge
                        elif edge['label'].lower() == 'false':
                            false_edge = edge
                    
                    if true_edge:
                        current_in_true_branch = true_edge['target']
                        while current_in_true_branch and current_in_true_branch != merge_node_id:
                            branch_node = get_node(current_in_true_branch)
                            if branch_node:
                                code += format_statement(branch_node.get('data', {}).get('label', ''), 2)
                            
                            branch_neighbors = adj.get(current_in_true_branch, [])
                            current_in_true_branch = branch_neighbors[0]['target'] if branch_neighbors else None
                    
                    code += f"{indent}}}\n"
                    
                    # Process false branch
                    if false_edge:
                        code += f"{indent}else {{\n"
                        current_in_false_branch = false_edge['target']
                        while current_in_false_branch and current_in_false_branch != merge_node_id:
                            branch_node = get_node(current_in_false_branch)
                            if branch_node:
                                code += format_statement(branch_node.get('data', {}).get('label', ''), 2)
                            
                            branch_neighbors = adj.get(current_in_false_branch, [])
                            current_in_false_branch = branch_neighbors[0]['target'] if branch_neighbors else None
                        
                        code += f"{indent}}}\n"
                    
                    current_node_id = merge_node_id
            
            else:
                break
        
        code += '\n  return 0;\n}'
        
        return JsonResponse({'code': code})
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)

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
                return parent_id

            # Hum 'named_children' use karenge taaki '{' jaise faltu tokens na aayein
            for child in node.named_children:
                created_node = None
                child_text = child.text.decode('utf8')

                # --- FUNCTION CALL LOGIC ---
                # expression_statement ke andar call_expression ho sakta hai
                if child.type == 'expression_statement' and child.children[0].type == 'call_expression':
                    created_node = create_node('inputOutput', child_text, x_pos, y_pos)

                elif child.type in ('declaration', 'return_statement'):
                    created_node = create_node('inputOutput', child_text, x_pos, y_pos)
                
                elif child.type == 'if_statement':
                    # ... (if-else ka logic waisa hi rahega)
                    condition = child.child_by_field_name('condition').text.decode('utf8')
                    if_node = create_node('decision', f"{condition}", x_pos, y_pos)
                    nodes.append(if_node)
                    edges.append(create_edge(current_parent_id, if_node['id']))
                    
                    merge_node = create_node('inputOutput', '', x_pos, y_pos + 240)
                    merge_node['data']['label'] = ''
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
                    continue
                
                # Baki saare loops aur switch ka logic waisa hi rahega
                # ... (for, while, switch logic here) ...
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
                    body_end_id = walk_ast(body_node, cond_node['id'], x_pos + 250)
                    
                    update = child.child_by_field_name('update')
                    update_text = update.text.decode('utf8') if update else ''
                    update_node = create_node('inputOutput', update_text, x_pos + 250, y_pos)
                    nodes.append(update_node)
                    edges.append(create_edge(body_end_id, update_node['id'], 'True'))
                    
                    edges.append(create_edge(update_node['id'], cond_node['id']))

                    current_parent_id = cond_node['id']
                    continue

                elif child.type == 'while_statement':
                    condition = child.child_by_field_name('condition')
                    cond_text = condition.text.decode('utf8') if condition else 'true'
                    cond_node = create_node('decision', cond_text, x_pos, y_pos)
                    nodes.append(cond_node)
                    edges.append(create_edge(current_parent_id, cond_node['id']))

                    body = child.child_by_field_name('body')
                    body_end_id = walk_ast(body, cond_node['id'], x_pos + 250)
                    edges.append(create_edge(body_end_id, cond_node['id'], 'True'))
                    
                    current_parent_id = cond_node['id']
                    continue

                elif child.type == 'switch_statement':
                    condition = child.child_by_field_name('condition').text.decode('utf8')
                    switch_node = create_node('decision', f"switch {condition}", x_pos, y_pos)
                    nodes.append(switch_node)
                    edges.append(create_edge(current_parent_id, switch_node['id']))
                    
                    body = child.child_by_field_name('body')
                    
                    merge_node = create_node('inputOutput', '', x_pos, y_pos + (len(body.named_children) * 120))
                    merge_node['data']['label'] = ''
                    nodes.append(merge_node)

                    case_x_offset = -200
                    
                    for case_statement in body.named_children:
                        if case_statement.type == 'case_statement':
                            value_node = case_statement.child_by_field_name('value')
                            case_label = value_node.text.decode('utf8') if value_node else "default"
                            
                            case_end_id = walk_ast(case_statement, switch_node['id'], x_pos + case_x_offset, merge_node['id'])
                            if case_end_id != merge_node['id']:
                                edges.append(create_edge(case_end_id, merge_node['id']))
                            
                            case_x_offset += 200
                        
                        elif case_statement.type == 'default_statement':
                            case_end_id = walk_ast(case_statement, switch_node['id'], x_pos + case_x_offset, merge_node['id'])
                            if case_end_id != merge_node['id']:
                                edges.append(create_edge(case_end_id, merge_node['id']))
                            
                            case_x_offset += 200


                    current_parent_id = merge_node['id']
                    continue

                if created_node:
                    nodes.append(created_node)
                    edges.append(create_edge(parent_id, created_node['id']))
                    current_parent_id = created_node['id']
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
        
        edges.append(create_edge(last_node_id, end_node['id']))

        return JsonResponse({'status': 'success', 'nodes': nodes, 'edges': edges})

    except Exception as e:
        import traceback
        traceback.print_exc()
        return JsonResponse({'status': 'error', 'message': str(e)}, status=500)