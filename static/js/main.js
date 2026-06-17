// Global State Variables
let releaseNotesData = [];
let filteredNotesData = [];
let selectedItem = null;
let currentFilter = 'all';
let searchQuery = '';

// SVG Circular Progress Ring calculations
const CIRCUMFERENCE = 2 * Math.PI * 14; // r=14 => ~87.96

// DOM Elements
const btnRefresh = document.getElementById('btn-refresh');
const refreshIcon = document.getElementById('refresh-icon');
const statusTimestamp = document.getElementById('status-timestamp');
const statTitle = document.getElementById('stat-title');
const statDate = document.getElementById('stat-date');
const searchInput = document.getElementById('search-input');
const searchClearBtn = document.getElementById('search-clear-btn');
const filterPillsContainer = document.getElementById('filter-pills-container');

const feedLoading = document.getElementById('feed-loading');
const feedError = document.getElementById('feed-error');
const feedEmpty = document.getElementById('feed-empty');
const feedList = document.getElementById('feed-list');
const errorMessage = document.getElementById('error-message');
const btnRetry = document.getElementById('btn-retry');
const btnResetFilters = document.getElementById('btn-reset-filters');

// Composer elements
const composerCard = document.getElementById('composer-card');
const composerPrompt = document.getElementById('composer-prompt');
const composerActive = document.getElementById('composer-active');
const composerBadge = document.getElementById('composer-badge');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountSpan = document.getElementById('char-count');
const progressCircle = document.getElementById('progress-circle');

// Composer tools & actions
const toolAiRephrase = document.getElementById('tool-ai-rephrase');
const toolHashtags = document.getElementById('tool-hashtags');
const toolResetDraft = document.getElementById('tool-reset-draft');
const btnCopyTweet = document.getElementById('btn-copy-tweet');
const btnTweet = document.getElementById('btn-tweet');

// Toast Toast element
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const toastIcon = document.getElementById('toast-icon');

// Initialize Progress Circle SVG stroke-dasharray
if (progressCircle) {
    progressCircle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    progressCircle.style.strokeDashoffset = CIRCUMFERENCE;
}

// Fetch release notes data on load
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Setup event handlers
function setupEventListeners() {
    btnRefresh.addEventListener('click', fetchReleaseNotes);
    btnRetry.addEventListener('click', fetchReleaseNotes);
    btnResetFilters.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClearBtn.style.display = 'none';
        setActiveFilterPill('all');
        currentFilter = 'all';
        applyFilters();
    });

    // Search input handlers
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        if (searchQuery.length > 0) {
            searchClearBtn.style.display = 'block';
        } else {
            searchClearBtn.style.display = 'none';
        }
        applyFilters();
    });

    searchClearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClearBtn.style.display = 'none';
        searchInput.focus();
        applyFilters();
    });

    // Filter pills selection
    filterPillsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-pill')) {
            const selectedType = e.target.getAttribute('data-type');
            setActiveFilterPill(selectedType);
            currentFilter = selectedType;
            applyFilters();
        }
    });

    // Tweet character validation and dynamic ring updates
    tweetTextarea.addEventListener('input', updateTweetCharacterState);

    // Composer Actions
    toolAiRephrase.addEventListener('click', generateAiTweetFormat);
    toolHashtags.addEventListener('click', appendHashtagsToTweet);
    toolResetDraft.addEventListener('click', resetTweetToOriginal);
    btnCopyTweet.addEventListener('click', copyTweetToClipboard);
    btnTweet.addEventListener('click', postTweetToTwitter);
}

// Set active pill design
function setActiveFilterPill(type) {
    const pills = filterPillsContainer.querySelectorAll('.filter-pill');
    pills.forEach(pill => {
        if (pill.getAttribute('data-type') === type) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });
}

// Show feedback message (Toast)
function showToast(message, isError = false) {
    toastMessage.textContent = message;
    
    if (isError) {
        toastIcon.className = "fa-solid fa-triangle-exclamation toast-icon error";
    } else {
        toastIcon.className = "fa-solid fa-check toast-icon";
    }
    
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// AJAX request to fetch feed data
function fetchReleaseNotes() {
    // Show spinner
    refreshIcon.classList.add('spinning');
    btnRefresh.disabled = true;
    
    // UI Loading State
    feedLoading.style.display = 'block';
    feedList.style.display = 'none';
    feedError.style.display = 'none';
    feedEmpty.style.display = 'none';

    fetch('/api/release-notes')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                releaseNotesData = data.entries;
                
                // Update header stats
                statTitle.textContent = data.feed_title;
                statTitle.title = data.feed_title;
                
                // Process update date
                if (data.feed_updated) {
                    const formattedDate = formatIsoDate(data.feed_updated);
                    statDate.textContent = formattedDate;
                } else {
                    statDate.textContent = "Unknown";
                }
                
                const now = new Date();
                statusTimestamp.textContent = `Last refreshed at ${now.toLocaleTimeString()}`;
                
                // Filter and render list
                applyFilters();
                showToast("Feed successfully loaded!");
            } else {
                throw new Error(data.error || "Failed to load response data");
            }
        })
        .catch(err => {
            console.error(err);
            feedError.style.display = 'flex';
            errorMessage.textContent = err.message;
            feedLoading.style.display = 'none';
            showToast("Failed to fetch release notes", true);
        })
        .finally(() => {
            // Stop spinner
            refreshIcon.classList.remove('spinning');
            btnRefresh.disabled = false;
        });
}

// Convert ISO date string to a simpler readable format
function formatIsoDate(isoStr) {
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return isoStr;
    }
}

// Apply searches and filter rules to active state
function applyFilters() {
    filteredNotesData = [];

    releaseNotesData.forEach(entry => {
        // Filter sub items inside each day entry
        const matchingItems = entry.items.filter(item => {
            // Check type filter
            const typeLower = item.type.toLowerCase();
            let matchesType = false;
            
            if (currentFilter === 'all') {
                matchesType = true;
            } else if (currentFilter === 'feature' && typeLower.includes('feature')) {
                matchesType = true;
            } else if (currentFilter === 'announcement' && typeLower.includes('announcement')) {
                matchesType = true;
            } else if (currentFilter === 'deprecation' && typeLower.includes('deprecat')) {
                matchesType = true;
            } else if (currentFilter === 'other') {
                // If it doesn't match feature, announcement, or deprecation
                matchesType = !typeLower.includes('feature') && !typeLower.includes('announcement') && !typeLower.includes('deprecat');
            }

            // Check search text query
            let matchesSearch = true;
            if (searchQuery.length > 0) {
                const searchInText = item.text.toLowerCase();
                const searchInType = item.type.toLowerCase();
                matchesSearch = searchInText.includes(searchQuery) || searchInType.includes(searchQuery);
            }

            return matchesType && matchesSearch;
        });

        // If this entry date contains items that matches, clone entry structure with matched items
        if (matchingItems.length > 0) {
            filteredNotesData.push({
                ...entry,
                items: matchingItems
            });
        }
    });

    renderFeedList();
}

// Render filtered data to the page
function renderFeedList() {
    feedLoading.style.display = 'none';
    
    if (filteredNotesData.length === 0) {
        feedList.style.display = 'none';
        feedEmpty.style.display = 'flex';
        return;
    }

    feedEmpty.style.display = 'none';
    feedList.style.display = 'flex';
    feedList.innerHTML = '';

    filteredNotesData.forEach((entry, entryIndex) => {
        const dateGroup = document.createElement('div');
        dateGroup.className = 'date-group';
        
        // Date Header
        const header = document.createElement('div');
        header.className = 'date-header';
        
        const title = document.createElement('h2');
        title.className = 'date-title';
        title.innerHTML = `<i class="fa-regular fa-calendar-days"></i> ${entry.date}`;
        
        const anchorLink = document.createElement('a');
        anchorLink.className = 'btn-feed-link';
        anchorLink.href = entry.link || '#';
        anchorLink.target = '_blank';
        anchorLink.rel = 'noopener noreferrer';
        anchorLink.innerHTML = `Feed Link <i class="fa-solid fa-arrow-up-right-from-square"></i>`;
        
        header.appendChild(title);
        header.appendChild(anchorLink);
        dateGroup.appendChild(header);

        // List items under this date
        entry.items.forEach((item, itemIndex) => {
            const releaseItem = document.createElement('article');
            
            // Map badge classes
            let badgeClass = 'badge-general';
            const tLower = item.type.toLowerCase();
            if (tLower.includes('feature')) badgeClass = 'badge-feature';
            else if (tLower.includes('announcement')) badgeClass = 'badge-announcement';
            else if (tLower.includes('deprecat')) badgeClass = 'badge-deprecation';
            else if (tLower.includes('changed')) badgeClass = 'badge-changed';
            
            releaseItem.className = `release-item ${badgeClass}`;
            
            // Unique item reference to track selection
            const itemRefId = `${entryIndex}-${itemIndex}`;
            if (selectedItem && selectedItem.refId === itemRefId) {
                releaseItem.classList.add('selected');
            }

            // Click listener
            releaseItem.addEventListener('click', () => {
                selectReleaseItem(item, entry.date, itemRefId, releaseItem);
            });

            // Card Structure
            releaseItem.innerHTML = `
                <div class="release-item-header">
                    <span class="type-badge">${item.type}</span>
                    <span class="item-action-indicator">
                        <i class="fa-brands fa-x-twitter"></i>
                        <span>Draft Tweet</span>
                    </span>
                </div>
                <div class="release-html-content">
                    ${item.html}
                </div>
            `;
            
            dateGroup.appendChild(releaseItem);
        });

        feedList.appendChild(dateGroup);
    });
}

// Handle Selecting a single card item and loading composer
function selectReleaseItem(item, date, refId, domElement) {
    // Unselect previous
    const activeSelected = feedList.querySelector('.release-item.selected');
    if (activeSelected) {
        activeSelected.classList.remove('selected');
    }

    // Add selected class to click element
    domElement.classList.add('selected');

    // Update global state tracking
    selectedItem = {
        ...item,
        date: date,
        refId: refId
    };

    // Swap composer state
    composerCard.classList.remove('empty-composer');
    composerPrompt.style.display = 'none';
    composerActive.style.display = 'flex';

    // Map badge design in composer
    const tLower = item.type.toLowerCase();
    composerBadge.className = "badge composer-update-type";
    if (tLower.includes('feature')) {
        composerBadge.classList.add('badge-feature');
        composerBadge.textContent = "Feature";
    } else if (tLower.includes('announcement')) {
        composerBadge.classList.add('badge-announcement');
        composerBadge.textContent = "Announcement";
    } else if (tLower.includes('deprecat')) {
        composerBadge.classList.add('badge-deprecation');
        composerBadge.textContent = "Deprecation";
    } else {
        composerBadge.classList.add('badge-general');
        composerBadge.textContent = item.type;
    }

    // Prepopulate Tweet draft text
    resetTweetToOriginal();
}

// Reset composer text to default format
function resetTweetToOriginal() {
    if (!selectedItem) return;
    
    // Construct default draft text
    const emojiMap = {
        'feature': '🚀',
        'announcement': '📢',
        'deprecation': '⚠️',
        'changed': '🔄',
        'general': '🔹'
    };
    
    let emoji = emojiMap.general;
    const typeLower = selectedItem.type.toLowerCase();
    for (const key in emojiMap) {
        if (typeLower.includes(key)) {
            emoji = emojiMap[key];
            break;
        }
    }
    
    // Clean original text preview
    let previewText = selectedItem.text;
    
    // Build default draft
    let draft = `${emoji} BigQuery ${selectedItem.type} (${selectedItem.date}):\n\n${previewText}`;
    
    // Cap draft initially to allow users to edit comfortably
    if (draft.length > 275) {
        draft = draft.slice(0, 270) + '...';
    }
    
    tweetTextarea.value = draft;
    updateTweetCharacterState();
}

// AI/Smart Rephrasing Logic on frontend
function generateAiTweetFormat() {
    if (!selectedItem) return;

    let text = selectedItem.text;
    let type = selectedItem.type;
    
    // Basic heuristics to make text punchy
    // 1. Remove obvious boilerplate
    text = text.replace(/Starting on/gi, 'From');
    text = text.replace(/This transition will occur in/gi, 'Occurs');
    text = text.replace(/For more information, see/gi, 'Info:');
    
    // 2. Formulate dynamic punchy headers
    const punchyHeaders = [
        `🔥 BigQuery Alert: ${type}!`,
        `💡 New in Google Cloud BigQuery:`,
        `⚡ BigQuery Dev Update!`,
        `🛠️ Cloud Data Update: BigQuery`
    ];
    
    // Pick headline based on type
    let header = punchyHeaders[2]; // Default dev update
    const typeLower = type.toLowerCase();
    if (typeLower.includes('feature')) {
        header = `🚀 BigQuery New Feature!`;
    } else if (typeLower.includes('deprecation')) {
        header = `⚠️ BigQuery Deprecation Alert:`;
    } else if (typeLower.includes('announcement')) {
        header = `📢 BigQuery Announcement:`;
    }

    // 3. Shorten sentences / Pick first 1-2 major points
    let sentences = text.split(/[.!?]\s+/);
    let mainSentence = sentences[0] || '';
    let secSentence = sentences[1] || '';
    
    let coreBody = mainSentence;
    if (secSentence && (header.length + coreBody.length + secSentence.length) < 190) {
        coreBody += '. ' + secSentence;
    }
    if (!coreBody.endsWith('.')) {
        coreBody += '.';
    }

    // 4. Join and append hashtags
    let formattedTweet = `${header}\n\n${coreBody}\n\n#BigQuery #GoogleCloud #DataEngineering`;
    
    // Truncate to safety limits (keeping space for hashtags)
    if (formattedTweet.length > 280) {
        const hashtags = "\n\n#BigQuery #GoogleCloud";
        const safetyLimit = 280 - hashtags.length - 4; // -4 for '...'
        formattedTweet = header + "\n\n" + coreBody.slice(0, safetyLimit) + "..." + hashtags;
    }

    tweetTextarea.value = formattedTweet;
    updateTweetCharacterState();
    showToast("Rephrased into punchy tech tweet!");
}

// Append typical hashtags
function appendHashtagsToTweet() {
    let currentVal = tweetTextarea.value.trim();
    const tags = "#BigQuery #GoogleCloud";
    
    if (currentVal.includes(tags)) {
        showToast("Hashtags already present!");
        return;
    }

    // Add trailing spaces or line breaks
    if (currentVal.length + tags.length + 2 <= 280) {
        tweetTextarea.value = currentVal + "\n\n" + tags;
    } else {
        // If it fits on the same line
        if (currentVal.length + tags.length + 1 <= 280) {
            tweetTextarea.value = currentVal + " " + tags;
        } else {
            showToast("Not enough space to insert tags!", true);
        }
    }
    updateTweetCharacterState();
}

// Validate character rules and animate progress ring
function updateTweetCharacterState() {
    const textVal = tweetTextarea.value;
    const length = textVal.length;
    const charsRemaining = 280 - length;
    
    // Character limit text update
    charCountSpan.textContent = charsRemaining;

    // Handle warning styling
    if (charsRemaining < 0) {
        charCountSpan.className = "char-count danger";
        btnTweet.disabled = true;
    } else if (charsRemaining <= 20) {
        charCountSpan.className = "char-count warning";
        btnTweet.disabled = false;
    } else {
        charCountSpan.className = "char-count";
        btnTweet.disabled = false;
    }

    // Calculate ring percentage and strokeOffset
    const percentage = Math.min(length / 280, 1);
    const strokeOffset = CIRCUMFERENCE - (percentage * CIRCUMFERENCE);
    progressCircle.style.strokeDashoffset = strokeOffset;

    // Set colors of progress ring based on limits
    if (charsRemaining < 0) {
        progressCircle.style.stroke = '#ef4444'; // Red danger
    } else if (charsRemaining <= 20) {
        progressCircle.style.stroke = '#f59e0b'; // Orange warning
    } else {
        progressCircle.style.stroke = '#1da1f2'; // Twitter Blue normal
    }
}

// Clipboard functionality
function copyTweetToClipboard() {
    const textToCopy = tweetTextarea.value;
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            showToast("Copied to clipboard!");
        })
        .catch(err => {
            console.error('Failed to copy: ', err);
            showToast("Failed to copy text", true);
        });
}

// Post intent URL trigger
function postTweetToTwitter() {
    const textToTweet = tweetTextarea.value;
    
    if (textToTweet.length > 280) {
        showToast("Tweet exceeds the 280 character limit!", true);
        return;
    }

    const twitterIntentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(textToTweet)}`;
    window.open(twitterIntentUrl, '_blank', 'noopener,noreferrer');
}
