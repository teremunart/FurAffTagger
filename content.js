let allTags = [];
let suggestionBox = null;
let selectedIndex = -1;
let searchTimeout = null;
let lastQuery = null;

const CSV_URL = "https://raw.githubusercontent.com/DraconicDragon/dbr-e621-lists-archive/refs/heads/main/tag-lists/e621/e621_2026-01-01_pt20-ia-ed.csv";

fetch(CSV_URL)
    .then(r => r.text())
    .then(data => {
        const lines = data.split(/\r?\n/);
        allTags = lines.slice(1).map(line => {
            const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (!parts || parts.length < 3) return null;
            return {
                name: parts[0].replace(/"/g, '').trim(),
                cat: parts[1].trim(),
                count: parseInt(parts[2]) || 0
            };
        }).filter(t => t && t.name);
        console.log(`FA e621 Tagger: ${allTags.length} tags loaded.`);
    });

function getCurrentWord(input) {
    const cursor = input.selectionStart;
    const textBefore = input.value.substring(0, cursor);
    const words = textBefore.split(/\s+/);
    return words[words.length - 1].toLowerCase();
}

document.addEventListener('mousedown', (e) => {
    if (e.target.id === 'keywords') {
        setTimeout(() => {
            const word = getCurrentWord(e.target);
            const matches = word.length >= 1
                ? allTags.filter(t => t.name.startsWith(word)).slice(0, 15)
                : allTags.slice(0, 15);
            renderSuggestions(e.target, matches, word);
        }, 10);
    }
});

document.addEventListener('input', (e) => {
    if (e.target.id !== 'keywords') return;

    const input = e.target;
    const currentWord = getCurrentWord(input);

    if (currentWord === lastQuery) return;
    lastQuery = currentWord;

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        const matches = currentWord.length >= 1
            ? allTags.filter(t => t.name.contains(currentWord)).sort((a,b) => b.count - a.count).slice(0, 15)
            : allTags.slice(0, 15);
        renderSuggestions(input, matches, currentWord);
    }, 100);
});

document.addEventListener('keydown', (e) => {
    if (!suggestionBox || e.target.id !== 'keywords') return;

    const items = suggestionBox.querySelectorAll('.tag-item');
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % items.length;
        updateSelection(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = (selectedIndex - 1 + items.length) % items.length;
        updateSelection(items);
    } else if (e.key === 'Enter' && selectedIndex > -1) {
        e.preventDefault();
        items[selectedIndex].click();
    } else if (e.key === 'Escape') {
        removeBox();
    }
});

function renderSuggestions(input, matches, query) {
    removeBox();
    if (matches.length === 0) return;

    suggestionBox = document.createElement('div');
    suggestionBox.className = 'fa-tag-autocomplete';

    const rect = input.getBoundingClientRect();
    suggestionBox.style.left = `${rect.left + window.scrollX}px`;
    suggestionBox.style.top = `${rect.bottom + window.scrollY}px`;
    suggestionBox.style.width = `${rect.width}px`;

    matches.forEach((tag, index) => {
        const item = document.createElement('div');
        item.className = `tag-item cat-${tag.cat}`;
        item.innerHTML = `<span>${tag.name}</span><small>${(tag.count/1000).toFixed(1)}k</small>`;

        item.onmousedown = (e) => e.preventDefault();

        item.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();

            const inputValue = input.value;
            const cursor = input.selectionStart;
            const textBefore = inputValue.substring(0, cursor);
            const lastSpace = textBefore.lastIndexOf(' ');

            const start = lastSpace === -1 ? 0 : lastSpace + 1;
            const before = inputValue.substring(0, start);
            const after = inputValue.substring(cursor);

            const newTagValue = tag.name + " ";
            input.value = before + newTagValue + after.trim();

            const newCursorPos = before.length + newTagValue.length;
            input.setSelectionRange(newCursorPos, newCursorPos);

            input.focus();

            lastQuery = "";
            const nextMatches = allTags.slice(0, 15);
            renderSuggestions(input, nextMatches, "");
        };
        suggestionBox.appendChild(item);
    });

    document.body.appendChild(suggestionBox);
}

function updateSelection(items) {
    items.forEach((item, i) => item.classList.toggle('selected', i === selectedIndex));
}

function removeBox() {
    if (suggestionBox) {
        suggestionBox.remove();
        suggestionBox = null;
        selectedIndex = -1;
    }
}

document.addEventListener('mousedown', (e) => {
    if (suggestionBox && !suggestionBox.contains(e.target) && e.target.id !== 'keywords') removeBox();
});