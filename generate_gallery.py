import os
import json
import urllib.parse
import html
from datetime import datetime

def generate_bookmarklet(code):
    encoded_code = urllib.parse.quote(code)
    return f"javascript:(function()%7B{encoded_code}%7D)()"

def get_scripts(base_dir):
    categories = {}
    if not os.path.exists(base_dir):
        print(f"Error: {base_dir} does not exist.")
        return {}
        
    ignore_folders = {'.git', '.github', 'node_modules', '__pycache__', '.astro'}
    
    for root, dirs, files in os.walk(base_dir):
        dirs[:] = [d for d in dirs if d not in ignore_folders]
        
        category = os.path.relpath(root, base_dir)
        if category == '.':
            category = 'General'
        
        js_files = [f for f in files if f.endswith('.js')]
        if category == 'General':
             js_files = [f for f in js_files if f not in ['generate_gallery.py']]

        if not js_files:
            continue
            
        if category not in categories:
            categories[category] = []
            
        for f in js_files:
            file_path = os.path.join(root, f)
            try:
                with open(file_path, 'r', encoding='utf-8') as js_file:
                    content = js_file.read()
                    categories[category].append({
                        'name': f.replace('.js', '').replace('_', ' '),
                        'code': content,
                        'bookmarklet': generate_bookmarklet(content)
                    })
            except Exception as e:
                print(f"Error reading {file_path}: {e}")
    return categories

def generate_html(categories):
    cat_names = sorted(categories.keys())
    if 'General' in cat_names:
        cat_names.remove('General')
        cat_names.insert(0, 'General')

    last_updated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    style_css = """
        :root {
            --bg-primary: #000000;
            --bg-secondary: #09090b;
            --accent: #3b82f6;
            --accent-glow: rgba(59, 130, 246, 0.15);
            --text-main: #ffffff;
            --text-dim: #a1a1aa;
            --border: #18181b;
        }
        
        body {
            background-color: var(--bg-primary);
            color: var(--text-main);
            font-family: 'Plus Jakarta Sans', sans-serif;
            background-image: 
                radial-gradient(circle at 50% -20%, rgba(59, 130, 246, 0.08) 0%, transparent 60%);
            overflow-x: hidden;
        }

        .glass {
            background: #09090b;
            border: 1px solid var(--border);
        }

        .search-container:focus-within {
            border-color: #3f3f46;
            box-shadow: 0 0 20px var(--accent-glow);
        }

        .bookmarklet-btn {
            background: #ffffff;
            color: #000000;
            transition: all 0.2s ease;
            cursor: move;
            will-change: transform;
        }

        .bookmarklet-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(255, 255, 255, 0.15);
            background: #f4f4f5;
        }

        .card-anim {
            transition: transform 0.2s ease, border-color 0.2s ease;
            will-change: transform;
        }

        .card-anim:hover {
            border-color: #3f3f46;
            transform: translateY(-4px);
        }

        ::-webkit-scrollbar {
            width: 8px;
        }
        ::-webkit-scrollbar-track {
            background: var(--bg-primary);
        }
        ::-webkit-scrollbar-thumb {
            background: #27272a;
            border-radius: 10px;
        }

        code, pre {
            font-family: 'JetBrains Mono', monospace;
        }

        .badge {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--text-dim);
        }
        
        #codeModal {
            background-color: rgba(0, 0, 0, 0.75);
        }
    """

    html_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bookmarklet Studio</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%233b82f6' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='M7 20h4a4 4 0 0 0 0-8h-4v8z'/><path d='M7 12h2a3 3 0 1 0 0-6h-2v6z'/></svg>">
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>{style_css}</style>
</head>
<body class="min-h-screen pb-20">
    <!-- Header -->
    <header class="pt-20 pb-12 px-4 relative overflow-hidden">
        <div class="max-w-4xl mx-auto text-center relative z-10">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-6">
                <i class="fas fa-bolt text-[10px]"></i> Powered by JavaScript
            </div>
            
            <h1 class="text-5xl md:text-7xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500">
                Bookmarklet Studio
            </h1>
            
            <p class="text-xl text-zinc-400 mb-10 font-medium">Professional browser automation at your fingertips.</p>
            
            <div class="search-container glass max-w-2xl mx-auto rounded-2xl flex items-center px-6 py-4 transition-all duration-300">
                <i class="fas fa-search text-zinc-500 text-lg mr-4"></i>
                <input type="text" id="searchInput" placeholder="Search automation tools..." 
                       class="bg-transparent border-none outline-none w-full text-zinc-200 placeholder-zinc-500 font-medium">
            </div>

            <div class="mt-8 flex flex-wrap justify-center gap-2" id="categoryFilters">
                <button class="cat-filter px-5 py-2 rounded-xl glass text-sm font-semibold hover:border-zinc-500 transition-all text-white bg-white/10 border-white" data-category="all">All Scripts</button>
                {filters}
            </div>
        </div>
    </header>

    <main class="max-w-7xl mx-auto px-6">
        <div id="gallery" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <!-- Cards injected via JS -->
        </div>

        <!-- Empty State -->
        <div id="emptyState" class="hidden text-center py-20">
            <div class="text-6xl text-zinc-700 mb-4"><i class="fas fa-folder-open"></i></div>
            <h3 class="text-xl font-bold text-zinc-400">No tools found matching your search</h3>
        </div>
    </main>

    <footer class="mt-20 border-t border-zinc-900 py-10 text-center">
        <p class="text-zinc-500 text-sm font-medium">
            Last synced: <span class="text-zinc-300">{last_updated}</span> • 
            <a href="https://github.com/NotNahid/bookmarklet" target="_blank" class="hover:text-indigo-400 transition">View Source</a>
        </p>
    </footer>

    <!-- Code Modal -->
    <div id="codeModal" class="fixed inset-0 hidden z-50 flex items-center justify-center p-4">
        <div class="bg-[#121217] border border-zinc-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col scale-95 transition-transform duration-200" id="modalContent">
            <div class="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 rounded-t-2xl">
                <div class="flex items-center gap-3">
                    <div class="w-3 h-3 rounded-full bg-red-500"></div>
                    <div class="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div class="w-3 h-3 rounded-full bg-green-500"></div>
                    <h3 id="modalTitle" class="ml-4 text-zinc-200 font-bold tracking-tight">Script.js</h3>
                </div>
                <button onclick="closeModal()" class="text-zinc-500 hover:text-white transition">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div class="p-8 overflow-auto flex-1 custom-scrollbar">
                <pre id="modalCode" class="text-zinc-300 text-[13px] leading-relaxed whitespace-pre-wrap selection:bg-indigo-500/30"></pre>
            </div>
            <div class="p-6 bg-zinc-900/50 border-t border-zinc-800 rounded-b-2xl flex justify-between items-center">
                <span class="text-xs text-zinc-500 font-mono">Press Ctrl+C to copy</span>
                <button id="copyModalBtn" class="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                    <i class="fas fa-copy"></i> Copy Source
                </button>
            </div>
        </div>
    </div>

    <script>
        const scripts = {scripts_json};
        const searchInput = document.getElementById('searchInput');
        const gallery = document.getElementById('gallery');
        const emptyState = document.getElementById('emptyState');
        const filters = document.querySelectorAll('.cat-filter');
        let activeCategory = 'all';

        function renderGallery() {
            const term = searchInput.value.toLowerCase();
            gallery.innerHTML = '';
            let count = 0;
            
            scripts.forEach(script => {
                const matchesSearch = script.name.toLowerCase().includes(term) || script.category.toLowerCase().includes(term);
                const matchesCategory = activeCategory === 'all' || script.category === activeCategory;
                
                if (matchesSearch && matchesCategory) {
                    count++;
                    const card = document.createElement('div');
                    card.className = 'glass rounded-2xl p-6 flex flex-col card-anim border border-zinc-800/50 group';
                    card.innerHTML = `
                        <div class="flex-1">
                            <div class="flex items-center justify-between mb-4">
                                <span class="badge px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight">${script.category}</span>
                                <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onclick="showCode('${script.id}')" title="View Source" class="w-8 h-8 rounded-lg glass flex items-center justify-center text-zinc-400 hover:text-white transition">
                                        <i class="fas fa-code text-xs"></i>
                                    </button>
                                    <button onclick="copyToClipboard('${script.id}', event)" title="Copy Code" class="w-8 h-8 rounded-lg glass flex items-center justify-center text-zinc-400 hover:text-white transition">
                                        <i class="fas fa-copy text-xs"></i>
                                    </button>
                                </div>
                            </div>
                            <h3 class="text-xl font-bold text-zinc-100 mb-6 leading-tight">${script.name}</h3>
                        </div>
                        <div class="mt-auto">
                            <a href="${script.bookmarklet}" 
                               class="bookmarklet-btn block w-full py-4 rounded-xl text-center text-black font-extrabold text-sm shadow-xl"
                               onclick="return false;" 
                               title="Drag this button to your bookmarks bar">
                                <i class="fas fa-hand-pointer mr-2 opacity-70"></i> Drag to Bookmarks
                            </a>
                        </div>
                    `;
                    gallery.appendChild(card);
                }
            });

            emptyState.style.display = count === 0 ? 'block' : 'none';
        }

        searchInput.addEventListener('input', renderGallery);
        
        const updateFilters = () => {
            filters.forEach(f => {
                if(f.getAttribute('data-category') === activeCategory) {
                    f.classList.add('border-white', 'text-white', 'bg-white/10');
                    f.classList.remove('text-zinc-400', 'border-zinc-800');
                } else {
                    f.classList.remove('border-white', 'text-white', 'bg-white/10');
                    f.classList.add('text-zinc-400', 'border-zinc-800');
                }
            });
        };

        filters.forEach(filter => {
            filter.addEventListener('click', () => {
                activeCategory = filter.getAttribute('data-category');
                updateFilters();
                renderGallery();
            });
        });

        const modal = document.getElementById('codeModal');
        const modalContent = document.getElementById('modalContent');
        const modalTitle = document.getElementById('modalTitle');
        const modalCode = document.getElementById('modalCode');
        const copyModalBtn = document.getElementById('copyModalBtn');

        function showCode(id) {
            const script = scripts.find(s => s.id === id);
            modalTitle.innerText = script.name + '.js';
            modalCode.innerText = script.code;
            modal.classList.remove('hidden');
            setTimeout(() => modalContent.classList.remove('scale-95'), 10);
            copyModalBtn.onclick = (e) => copyToClipboard(id, e);
        }

        function closeModal() {
            modalContent.classList.add('scale-95');
            setTimeout(() => modal.classList.add('hidden'), 200);
        }

        function copyToClipboard(id, event) {
            const script = scripts.find(s => s.id === id);
            navigator.clipboard.writeText(script.code).then(() => {
                const btn = event.target.closest('button');
                const originalContent = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-check"></i>';
                if(btn.id === 'copyModalBtn') btn.innerHTML = '<i class="fas fa-check mr-2"></i> Copied!';
                setTimeout(() => {
                    btn.innerHTML = originalContent;
                }, 2000);
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        updateFilters();
        renderGallery();
    </script>
</body>
</html>
    """
    
    filters_html = ""
    for cat in cat_names:
        filters_html += f'<button class="cat-filter px-5 py-2 rounded-xl glass text-sm font-semibold text-zinc-400 border-zinc-800 hover:border-zinc-500 transition-all" data-category="{cat}">{cat}</button>\\n'
    
    flat_scripts = []
    for cat in cat_names:
        for script in categories[cat]:
            script_id = f"{cat}-{script['name']}".replace(' ', '-')
            flat_scripts.append({
                'id': script_id,
                'name': script['name'],
                'category': cat,
                'code': script['code'],
                'bookmarklet': script['bookmarklet']
            })
            
    final_html = html_template.replace('{filters}', filters_html)
    final_html = final_html.replace('{scripts_json}', json.dumps(flat_scripts))
    final_html = final_html.replace('{last_updated}', last_updated)
    final_html = final_html.replace('{style_css}', style_css)
    
    return final_html

if __name__ == "__main__":
    # If running inside the repo, base_dir is '.'
    # If running outside (local watcher), it might be 'bookmarklet_repo'
    base_dir = '.' if os.path.exists('README.md') and not os.path.exists('bookmarklet_repo') else 'bookmarklet_repo'
    
    # Check if we are inside the repo already (common for GitHub Actions)
    if os.path.exists('.git') and not os.path.exists('bookmarklet_repo'):
        base_dir = '.'

    scripts_data = get_scripts(base_dir)
    if scripts_data:
        html_content = generate_html(scripts_data)
        with open('index.html', 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"Gallery updated successfully at {datetime.now().strftime('%H:%M:%S')}")
    else:
        print("No scripts found. Gallery not updated.")
