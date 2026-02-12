/**
 * YouTube Studio Subtitle Automation - Production Version
 * Automates adding and publishing translated subtitles across multiple languages
 */

(function() {
  'use strict';

  // Prevent double execution
  if (window.YTSubtitleAutomator) {
    console.warn('YouTube Subtitle Automator is already running');
    return;
  }

  // Configuration
  const CONFIG = {
    languages: [
      'Arabic', 'Bangla', 'Chinese', 'French', 'German', 
      'Hindi', 'Italian', 'Japanese', 'Korean', 'Portuguese', 
      'Turkish', 'Urdu'
    ],
    maxWaitTime: 30000, // 30 seconds max wait for any operation
    checkInterval: 200, // Check every 200ms
    highlightDuration: 800,
    retryAttempts: 3,
    speedMultiplier: 1, // 0.5 = fast, 1 = normal, 2 = slow
    soundEnabled: true,
    autoSaveState: true
  };

  // State management
  const state = {
    currentLanguageIndex: 0,
    currentStep: '',
    isPaused: false,
    isStopped: false,
    isRunning: false,
    isMinimized: false,
    errors: [],
    completedLanguages: [],
    skippedLanguages: [],
    selectedLanguages: [...CONFIG.languages], // All selected by default
    startTime: null,
    logs: []
  };

  // Utility: Play notification sound
  function playSound(type = 'success') {
    if (!CONFIG.soundEnabled) return;
    
    const frequencies = {
      success: [523.25, 659.25, 783.99], // C, E, G
      error: [392.00, 329.63], // G, E (descending)
      complete: [523.25, 659.25, 783.99, 1046.50] // C, E, G, C
    };
    
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const freq = frequencies[type] || frequencies.success;
      
      freq.forEach((f, i) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = f;
        oscillator.type = 'sine';
        
        const startTime = audioContext.currentTime + (i * 0.15);
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.15);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.15);
      });
    } catch (e) {
      console.log('Sound playback not available');
    }
  }

  // Utility: Save state to localStorage
  function saveState() {
    if (!CONFIG.autoSaveState) return;
    
    try {
      const stateToSave = {
        currentLanguageIndex: state.currentLanguageIndex,
        completedLanguages: state.completedLanguages,
        skippedLanguages: state.skippedLanguages,
        selectedLanguages: state.selectedLanguages,
        timestamp: Date.now()
      };
      localStorage.setItem('yt-subtitle-automator-state', JSON.stringify(stateToSave));
    } catch (e) {
      console.warn('Could not save state:', e);
    }
  }

  // Utility: Load state from localStorage
  function loadState() {
    try {
      const saved = localStorage.getItem('yt-subtitle-automator-state');
      if (saved) {
        const data = JSON.parse(saved);
        // Only load if saved within last 24 hours
        if (Date.now() - data.timestamp < 86400000) {
          return data;
        }
      }
    } catch (e) {
      console.warn('Could not load state:', e);
    }
    return null;
  }

  // Utility: Clear saved state
  function clearState() {
    try {
      localStorage.removeItem('yt-subtitle-automator-state');
    } catch (e) {
      console.warn('Could not clear state:', e);
    }
  }

  // Utility: Estimate time remaining
  function estimateTimeRemaining() {
    if (!state.startTime || state.completedLanguages.length === 0) {
      return 'Calculating...';
    }
    
    const elapsed = Date.now() - state.startTime;
    const avgTimePerLanguage = elapsed / state.completedLanguages.length;
    const remaining = state.selectedLanguages.length - state.completedLanguages.length - state.skippedLanguages.length;
    const estimatedMs = avgTimePerLanguage * remaining;
    
    const minutes = Math.floor(estimatedMs / 60000);
    const seconds = Math.floor((estimatedMs % 60000) / 1000);
    
    if (minutes > 0) {
      return `~${minutes}m ${seconds}s`;
    } else {
      return `~${seconds}s`;
    }
  }

  // Utility: Add log entry
  function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    state.logs.push({ timestamp, message, type });
    
    // Keep only last 100 logs
    if (state.logs.length > 100) {
      state.logs.shift();
    }
    
    // Update log display if visible
    const logContainer = document.getElementById('yt-auto-log-container');
    if (logContainer && logContainer.style.display !== 'none') {
      updateLogDisplay();
    }
  }

  // Utility: Update log display
  function updateLogDisplay() {
    const logContainer = document.getElementById('yt-auto-log-entries');
    if (!logContainer) return;
    
    logContainer.innerHTML = '';
    state.logs.slice().reverse().forEach(log => {
      const entry = document.createElement('div');
      entry.style.cssText = `
        padding: 6px 10px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        font-size: 12px;
        font-family: monospace;
      `;
      
      const colors = {
        info: '#e0e0e0',
        success: '#4ade80',
        error: '#f87171',
        warning: '#fbbf24'
      };
      
      entry.style.color = colors[log.type] || colors.info;
      entry.textContent = `[${log.timestamp}] ${log.message}`;
      logContainer.appendChild(entry);
    });
    
    // Auto-scroll to bottom
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  // Utility: Export results as CSV
  function exportResults() {
    const rows = [
      ['Language', 'Status', 'Timestamp']
    ];
    
    state.completedLanguages.forEach(lang => {
      rows.push([lang, 'Completed', new Date().toLocaleString()]);
    });
    
    state.skippedLanguages.forEach(lang => {
      rows.push([lang, 'Skipped (Already Done)', new Date().toLocaleString()]);
    });
    
    state.errors.forEach(err => {
      rows.push([err.language, `Error: ${err.error}`, new Date().toLocaleString()]);
    });
    
    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube-subtitles-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    URL.revokeObjectURL(url);
    addLog('Results exported to CSV', 'success');
  }

  // Utility: Check if language already has published subtitles
  function isLanguageAlreadyTranslated(language) {
    console.log(`Checking if ${language} is already translated...`);
    
    // Find all translation rows in the table
    const rows = Array.from(document.querySelectorAll('ytgn-video-translation-row'));
    console.log(`Found ${rows.length} translation rows`);
    
    for (const row of rows) {
      try {
        // Try multiple methods to find the language name
        let rowLanguage = null;
        
        // Method 1: Direct querySelector
        let languageSpan = row.querySelector('.language-display-name span');
        if (languageSpan) {
          rowLanguage = languageSpan.textContent.trim();
        }
        
        // Method 2: Search in shadow root if exists
        if (!rowLanguage && row.shadowRoot) {
          languageSpan = row.shadowRoot.querySelector('.language-display-name span');
          if (languageSpan) {
            rowLanguage = languageSpan.textContent.trim();
          }
        }
        
        // Method 3: Deep search using our recursive finder
        if (!rowLanguage) {
          languageSpan = findInShadowDOM('.language-display-name span', row);
          if (languageSpan) {
            rowLanguage = languageSpan.textContent.trim();
          }
        }
        
        if (!rowLanguage) continue;
        
        console.log(`Row language: "${rowLanguage}"`);
        
        // Match the language (case-insensitive, trim whitespace)
        if (rowLanguage.toLowerCase() === language.toLowerCase()) {
          console.log(`Found matching row for ${language}`);
          
          // Try to find the status container
          let statusContainer = row.querySelector('.tablecell-captions #status-container');
          
          // Try shadow root
          if (!statusContainer && row.shadowRoot) {
            statusContainer = row.shadowRoot.querySelector('.tablecell-captions #status-container');
          }
          
          // Deep search
          if (!statusContainer) {
            statusContainer = findInShadowDOM('.tablecell-captions #status-container', row);
          }
          
          // Alternative: search for any element with "Published" text in the captions cell
          if (!statusContainer) {
            const captionsCell = row.querySelector('.tablecell-captions') || 
                               (row.shadowRoot && row.shadowRoot.querySelector('.tablecell-captions')) ||
                               findInShadowDOM('.tablecell-captions', row);
            
            if (captionsCell) {
              const cellText = captionsCell.textContent.trim();
              console.log(`Captions cell text: "${cellText}"`);
              if (cellText.toLowerCase().includes('published')) {
                console.log(`✓ ${language} already has published subtitles - skipping`);
                return true;
              }
            }
          } else {
            const statusText = statusContainer.textContent.trim();
            console.log(`Status text: "${statusText}"`);
            if (statusText.toLowerCase().includes('published')) {
              console.log(`✓ ${language} already has published subtitles - skipping`);
              return true;
            }
          }
          
          console.log(`${language} not published yet`);
          return false;
        }
      } catch (error) {
        console.error(`Error checking row:`, error);
        continue;
      }
    }
    
    console.log(`${language} not found in existing rows - needs to be added`);
    return false;
  }

  // Utility: Wait for element with timeout
  async function waitForElement(selector, options = {}) {
    const {
      timeout = CONFIG.maxWaitTime,
      shadowRoot = null,
      checkVisibility = true,
      checkEnabled = false,
      parent = null
    } = options;

    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (state.isStopped) throw new Error('Stopped by user');
      
      while (state.isPaused) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (state.isStopped) throw new Error('Stopped by user');
      }

      let element;
      const root = parent || shadowRoot || document;
      
      if (typeof selector === 'function') {
        element = selector(root);
      } else {
        element = root.querySelector(selector);
      }

      if (element) {
        if (checkVisibility) {
          const rect = element.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && 
                          window.getComputedStyle(element).display !== 'none' &&
                          window.getComputedStyle(element).visibility !== 'hidden';
          if (!isVisible) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.checkInterval));
            continue;
          }
        }
        
        if (checkEnabled && element.disabled) {
          await new Promise(resolve => setTimeout(resolve, CONFIG.checkInterval));
          continue;
        }
        
        return element;
      }
      
      await new Promise(resolve => setTimeout(resolve, CONFIG.checkInterval));
    }
    
    throw new Error(`Timeout waiting for element: ${selector.toString()}`);
  }

  // Utility: Find elements in shadow DOM recursively
  function findInShadowDOM(selector, root = document.body) {
    // Try regular DOM first
    let element = root.querySelector(selector);
    if (element) return element;

    // Search in shadow roots
    const allElements = root.querySelectorAll('*');
    for (const el of allElements) {
      if (el.shadowRoot) {
        element = findInShadowDOM(selector, el.shadowRoot);
        if (element) return element;
      }
    }
    return null;
  }

  // Utility: Find element by text content in shadow DOM
  function findByText(text, tagName = '*', root = document.body) {
    const elements = Array.from(root.querySelectorAll(tagName));
    for (const el of elements) {
      if (el.textContent.trim().toLowerCase().includes(text.toLowerCase())) {
        return el;
      }
    }

    // Search in shadow roots
    const allElements = root.querySelectorAll('*');
    for (const el of allElements) {
      if (el.shadowRoot) {
        const found = findByText(text, tagName, el.shadowRoot);
        if (found) return found;
      }
    }
    return null;
  }

  // Utility: Highlight element before clicking
  function highlightElement(element) {
    return new Promise(resolve => {
      const originalOutline = element.style.outline;
      const originalBoxShadow = element.style.boxShadow;
      
      element.style.outline = '3px solid #ff0000';
      element.style.boxShadow = '0 0 10px rgba(255, 0, 0, 0.5)';
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      setTimeout(() => {
        element.style.outline = originalOutline;
        element.style.boxShadow = originalBoxShadow;
        resolve();
      }, CONFIG.highlightDuration);
    });
  }

  // Utility: Safe click with highlight
  async function safeClick(element, description = '') {
    await highlightElement(element);
    console.log(`Clicking: ${description}`);
    
    // Try multiple click methods for robustness
    element.click();
    
    // Dispatch events for Polymer components
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // UI Panel - Using DOM methods to avoid TrustedHTML CSP issues
  function createUI() {
    // Check for saved state
    const savedState = loadState();
    if (savedState && confirm('Resume from previous session?')) {
      state.currentLanguageIndex = savedState.currentLanguageIndex;
      state.completedLanguages = savedState.completedLanguages || [];
      state.skippedLanguages = savedState.skippedLanguages || [];
      state.selectedLanguages = savedState.selectedLanguages || CONFIG.languages;
    }
    
    // Main panel container
    const panel = document.createElement('div');
    panel.id = 'yt-subtitle-automator-panel';
    
    // Outer wrapper (draggable)
    const wrapper = document.createElement('div');
    wrapper.id = 'yt-auto-wrapper';
    wrapper.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      color: white;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      z-index: 999999;
      overflow: hidden;
      cursor: move;
    `;
    
    // Make draggable
    makeDraggable(wrapper);
    
    // Header section
    const header = document.createElement('div');
    header.style.cssText = 'padding: 15px 20px; border-bottom: 1px solid rgba(255,255,255,0.2); display: flex; justify-content: space-between; align-items: center; cursor: move;';
    
    const headerLeft = document.createElement('div');
    
    const title = document.createElement('h3');
    title.style.cssText = 'margin: 0 0 5px 0; font-size: 18px; font-weight: 600;';
    title.textContent = '🌐 Subtitle Automator';
    
    const subtitle = document.createElement('div');
    subtitle.style.cssText = 'font-size: 12px; opacity: 0.9;';
    subtitle.textContent = 'Advanced Control Panel';
    
    headerLeft.appendChild(title);
    headerLeft.appendChild(subtitle);
    
    const headerRight = document.createElement('div');
    headerRight.style.cssText = 'display: flex; gap: 10px;';
    
    const minimizeBtn = document.createElement('button');
    minimizeBtn.id = 'yt-auto-minimize-btn';
    minimizeBtn.textContent = '−';
    minimizeBtn.style.cssText = `
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.id = 'yt-auto-close-btn';
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: rgba(239, 68, 68, 0.8);
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    headerRight.appendChild(minimizeBtn);
    headerRight.appendChild(closeBtn);
    
    header.appendChild(headerLeft);
    header.appendChild(headerRight);
    
    // Content section
    const content = document.createElement('div');
    content.id = 'yt-auto-content';
    content.style.cssText = 'padding: 20px; max-height: 600px; overflow-y: auto; cursor: default;';
    
    // Current Status section
    const statusSection = createStatusSection();
    
    // Language Selection section
    const langSection = createLanguageSelectionSection();
    
    // Controls section  
    const controlsSection = createControlsSection();
    
    // Advanced Settings section
    const settingsSection = createSettingsSection();
    
    // Log Viewer section
    const logSection = createLogSection();
    
    // Assemble content
    content.appendChild(statusSection);
    content.appendChild(langSection);
    content.appendChild(controlsSection);
    content.appendChild(settingsSection);
    content.appendChild(logSection);
    
    // Assemble wrapper
    wrapper.appendChild(header);
    wrapper.appendChild(content);
    
    // Assemble panel
    panel.appendChild(wrapper);
    
    // Add to document
    document.body.appendChild(panel);
    
    // Add event listeners
    setupEventListeners();
  }

  function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    const header = element.querySelector('div');
    if (header) {
      header.onmousedown = dragMouseDown;
    }
    
    function dragMouseDown(e) {
      // Don't drag if clicking on buttons or inputs
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        return;
      }
      
      e.preventDefault();
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      document.onmousemove = elementDrag;
    }
    
    function elementDrag(e) {
      e.preventDefault();
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      element.style.top = (element.offsetTop - pos2) + 'px';
      element.style.left = (element.offsetLeft - pos1) + 'px';
      element.style.right = 'auto';
    }
    
    function closeDragElement() {
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  function createStatusSection() {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 20px;';
    
    const sectionTitle = document.createElement('div');
    sectionTitle.style.cssText = 'font-size: 14px; font-weight: 600; margin-bottom: 10px; opacity: 0.9;';
    sectionTitle.textContent = '📊 Current Status';
    
    // Current Language
    const langDiv = document.createElement('div');
    langDiv.style.cssText = 'margin-bottom: 10px;';
    
    const langLabel = document.createElement('div');
    langLabel.style.cssText = 'font-size: 11px; opacity: 0.8; margin-bottom: 3px;';
    langLabel.textContent = 'Processing';
    
    const langValue = document.createElement('div');
    langValue.id = 'yt-auto-current-lang';
    langValue.style.cssText = 'font-size: 16px; font-weight: 600;';
    langValue.textContent = 'Ready to start';
    
    langDiv.appendChild(langLabel);
    langDiv.appendChild(langValue);
    
    // Current Step
    const stepDiv = document.createElement('div');
    stepDiv.style.cssText = 'margin-bottom: 10px;';
    
    const stepLabel = document.createElement('div');
    stepLabel.style.cssText = 'font-size: 11px; opacity: 0.8; margin-bottom: 3px;';
    stepLabel.textContent = 'Step';
    
    const stepValue = document.createElement('div');
    stepValue.id = 'yt-auto-current-step';
    stepValue.style.cssText = 'font-size: 13px;';
    stepValue.textContent = 'Waiting...';
    
    stepDiv.appendChild(stepLabel);
    stepDiv.appendChild(stepValue);
    
    // Progress bar
    const progressDiv = document.createElement('div');
    progressDiv.style.cssText = 'margin-bottom: 10px;';
    
    const progressLabel = document.createElement('div');
    progressLabel.style.cssText = 'font-size: 11px; opacity: 0.8; margin-bottom: 5px; display: flex; justify-content: space-between;';
    
    const progressLabelText = document.createElement('span');
    progressLabelText.textContent = 'Progress';
    
    const progressETA = document.createElement('span');
    progressETA.id = 'yt-auto-eta';
    progressETA.textContent = '';
    
    progressLabel.appendChild(progressLabelText);
    progressLabel.appendChild(progressETA);
    
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = 'display: flex; align-items: center; gap: 10px;';
    
    const progressBarBg = document.createElement('div');
    progressBarBg.style.cssText = 'flex: 1; background: rgba(255,255,255,0.2); border-radius: 10px; height: 8px; overflow: hidden;';
    
    const progressBar = document.createElement('div');
    progressBar.id = 'yt-auto-progress-bar';
    progressBar.style.cssText = 'width: 0%; height: 100%; background: #4ade80; transition: width 0.3s;';
    
    const progressText = document.createElement('div');
    progressText.id = 'yt-auto-progress-text';
    progressText.style.cssText = 'font-size: 13px; font-weight: 600; min-width: 50px;';
    progressText.textContent = '0/0';
    
    progressBarBg.appendChild(progressBar);
    progressContainer.appendChild(progressBarBg);
    progressContainer.appendChild(progressText);
    progressDiv.appendChild(progressLabel);
    progressDiv.appendChild(progressContainer);
    
    section.appendChild(sectionTitle);
    section.appendChild(langDiv);
    section.appendChild(stepDiv);
    section.appendChild(progressDiv);
    
    return section;
  }

  function createLanguageSelectionSection() {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px;';
    
    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';
    
    const sectionTitle = document.createElement('div');
    sectionTitle.style.cssText = 'font-size: 14px; font-weight: 600; opacity: 0.9;';
    sectionTitle.textContent = '🌍 Select Languages';
    
    const bulkButtons = document.createElement('div');
    bulkButtons.style.cssText = 'display: flex; gap: 5px;';
    
    const selectAllBtn = document.createElement('button');
    selectAllBtn.id = 'yt-auto-select-all';
    selectAllBtn.textContent = 'All';
    selectAllBtn.style.cssText = 'padding: 4px 8px; font-size: 11px; background: rgba(255,255,255,0.2); border: none; border-radius: 4px; color: white; cursor: pointer;';
    
    const selectNoneBtn = document.createElement('button');
    selectNoneBtn.id = 'yt-auto-select-none';
    selectNoneBtn.textContent = 'None';
    selectNoneBtn.style.cssText = 'padding: 4px 8px; font-size: 11px; background: rgba(255,255,255,0.2); border: none; border-radius: 4px; color: white; cursor: pointer;';
    
    bulkButtons.appendChild(selectAllBtn);
    bulkButtons.appendChild(selectNoneBtn);
    header.appendChild(sectionTitle);
    header.appendChild(bulkButtons);
    
    const langList = document.createElement('div');
    langList.id = 'yt-auto-lang-list';
    langList.style.cssText = 'max-height: 200px; overflow-y: auto; margin-top: 10px;';
    
    CONFIG.languages.forEach(lang => {
      const langItem = document.createElement('label');
      langItem.style.cssText = 'display: flex; align-items: center; padding: 6px; cursor: pointer; border-radius: 4px; transition: background 0.2s;';
      langItem.onmouseenter = () => langItem.style.background = 'rgba(255,255,255,0.1)';
      langItem.onmouseleave = () => langItem.style.background = 'transparent';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'yt-auto-lang-checkbox';
      checkbox.value = lang;
      checkbox.checked = state.selectedLanguages.includes(lang);
      checkbox.style.cssText = 'margin-right: 8px; cursor: pointer;';
      
      const langText = document.createElement('span');
      langText.style.cssText = 'font-size: 13px; flex: 1;';
      langText.textContent = lang;
      
      const statusBadge = document.createElement('span');
      statusBadge.style.cssText = 'font-size: 10px; padding: 2px 6px; border-radius: 10px; margin-left: 8px;';
      
      if (isLanguageAlreadyTranslated(lang)) {
        statusBadge.textContent = '✓ Done';
        statusBadge.style.background = 'rgba(74, 222, 128, 0.3)';
      }
      
      langItem.appendChild(checkbox);
      langItem.appendChild(langText);
      if (statusBadge.textContent) langItem.appendChild(statusBadge);
      
      langList.appendChild(langItem);
    });
    
    section.appendChild(header);
    section.appendChild(langList);
    
    return section;
  }

  function createControlsSection() {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 20px;';
    
    const buttonGrid = document.createElement('div');
    buttonGrid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 10px;';
    
    const buttons = [
      { id: 'yt-auto-start-btn', text: '▶ Start', color: 'rgba(74, 222, 128, 0.8)' },
      { id: 'yt-auto-pause-btn', text: '⏸ Pause', color: 'rgba(251, 191, 36, 0.8)' },
      { id: 'yt-auto-resume-btn', text: '▶ Resume', color: 'rgba(74, 222, 128, 0.8)', hidden: true },
      { id: 'yt-auto-stop-btn', text: '⏹ Stop', color: 'rgba(239, 68, 68, 0.8)' },
      { id: 'yt-auto-skip-btn', text: '⏭ Skip Current', color: 'rgba(168, 85, 247, 0.8)' },
      { id: 'yt-auto-retry-btn', text: '🔁 Retry Current', color: 'rgba(59, 130, 246, 0.8)' }
    ];
    
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.id = btn.id;
      button.textContent = btn.text;
      button.style.cssText = `
        padding: 12px;
        background: ${btn.color};
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 6px;
        color: white;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        ${btn.hidden ? 'display: none;' : ''}
      `;
      buttonGrid.appendChild(button);
    });
    
    section.appendChild(buttonGrid);
    
    return section;
  }

  function createSettingsSection() {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 20px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px;';
    
    const header = document.createElement('div');
    header.style.cssText = 'font-size: 14px; font-weight: 600; margin-bottom: 10px; opacity: 0.9; cursor: pointer;';
    header.textContent = '⚙️ Advanced Settings';
    header.id = 'yt-auto-settings-toggle';
    
    const settingsContent = document.createElement('div');
    settingsContent.id = 'yt-auto-settings-content';
    settingsContent.style.cssText = 'display: none;';
    
    // Speed control
    const speedDiv = document.createElement('div');
    speedDiv.style.cssText = 'margin-bottom: 15px;';
    
    const speedLabel = document.createElement('div');
    speedLabel.style.cssText = 'font-size: 12px; margin-bottom: 5px; display: flex; justify-content: space-between;';
    
    const speedLabelText = document.createElement('span');
    speedLabelText.textContent = 'Speed';
    
    const speedValue = document.createElement('span');
    speedValue.id = 'yt-auto-speed-value';
    speedValue.textContent = 'Normal';
    
    speedLabel.appendChild(speedLabelText);
    speedLabel.appendChild(speedValue);
    
    const speedSlider = document.createElement('input');
    speedSlider.type = 'range';
    speedSlider.id = 'yt-auto-speed-slider';
    speedSlider.min = '0.5';
    speedSlider.max = '2';
    speedSlider.step = '0.5';
    speedSlider.value = '1';
    speedSlider.style.cssText = 'width: 100%; cursor: pointer;';
    
    speedDiv.appendChild(speedLabel);
    speedDiv.appendChild(speedSlider);
    
    // Retry attempts
    const retryDiv = document.createElement('div');
    retryDiv.style.cssText = 'margin-bottom: 15px;';
    
    const retryLabel = document.createElement('div');
    retryLabel.style.cssText = 'font-size: 12px; margin-bottom: 5px;';
    retryLabel.textContent = 'Retry Attempts';
    
    const retryInput = document.createElement('input');
    retryInput.type = 'number';
    retryInput.id = 'yt-auto-retry-input';
    retryInput.min = '1';
    retryInput.max = '10';
    retryInput.value = '3';
    retryInput.style.cssText = 'width: 100%; padding: 8px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; color: white;';
    
    retryDiv.appendChild(retryLabel);
    retryDiv.appendChild(retryInput);
    
    // Sound toggle
    const soundDiv = document.createElement('div');
    soundDiv.style.cssText = 'margin-bottom: 15px;';
    
    const soundLabel = document.createElement('label');
    soundLabel.style.cssText = 'display: flex; align-items: center; cursor: pointer; font-size: 12px;';
    
    const soundCheckbox = document.createElement('input');
    soundCheckbox.type = 'checkbox';
    soundCheckbox.id = 'yt-auto-sound-toggle';
    soundCheckbox.checked = CONFIG.soundEnabled;
    soundCheckbox.style.cssText = 'margin-right: 8px; cursor: pointer;';
    
    soundLabel.appendChild(soundCheckbox);
    soundLabel.appendChild(document.createTextNode('🔔 Sound Notifications'));
    soundDiv.appendChild(soundLabel);
    
    // Auto-save toggle
    const saveDiv = document.createElement('div');
    saveDiv.style.cssText = 'margin-bottom: 15px;';
    
    const saveLabel = document.createElement('label');
    saveLabel.style.cssText = 'display: flex; align-items: center; cursor: pointer; font-size: 12px;';
    
    const saveCheckbox = document.createElement('input');
    saveCheckbox.type = 'checkbox';
    saveCheckbox.id = 'yt-auto-save-toggle';
    saveCheckbox.checked = CONFIG.autoSaveState;
    saveCheckbox.style.cssText = 'margin-right: 8px; cursor: pointer;';
    
    saveLabel.appendChild(saveCheckbox);
    saveLabel.appendChild(document.createTextNode('💾 Auto-Save Progress'));
    saveDiv.appendChild(saveLabel);
    
    // Export button
    const exportBtn = document.createElement('button');
    exportBtn.id = 'yt-auto-export-btn';
    exportBtn.textContent = '📥 Export Results (CSV)';
    exportBtn.style.cssText = 'width: 100%; padding: 10px; background: rgba(59, 130, 246, 0.8); border: none; border-radius: 6px; color: white; font-size: 12px; cursor: pointer;';
    
    settingsContent.appendChild(speedDiv);
    settingsContent.appendChild(retryDiv);
    settingsContent.appendChild(soundDiv);
    settingsContent.appendChild(saveDiv);
    settingsContent.appendChild(exportBtn);
    
    section.appendChild(header);
    section.appendChild(settingsContent);
    
    return section;
  }

  function createLogSection() {
    const section = document.createElement('div');
    section.style.cssText = 'margin-bottom: 20px;';
    
    const header = document.createElement('div');
    header.style.cssText = 'font-size: 14px; font-weight: 600; margin-bottom: 10px; opacity: 0.9; cursor: pointer; display: flex; justify-content: space-between; align-items: center;';
    header.id = 'yt-auto-log-toggle';
    
    const headerText = document.createElement('span');
    headerText.textContent = '📋 Activity Log';
    
    const clearBtn = document.createElement('button');
    clearBtn.id = 'yt-auto-clear-log';
    clearBtn.textContent = 'Clear';
    clearBtn.style.cssText = 'padding: 4px 8px; font-size: 11px; background: rgba(255,255,255,0.2); border: none; border-radius: 4px; color: white; cursor: pointer;';
    
    header.appendChild(headerText);
    header.appendChild(clearBtn);
    
    const logContainer = document.createElement('div');
    logContainer.id = 'yt-auto-log-container';
    logContainer.style.cssText = 'display: none; max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); border-radius: 6px; padding: 10px;';
    
    const logEntries = document.createElement('div');
    logEntries.id = 'yt-auto-log-entries';
    
    logContainer.appendChild(logEntries);
    section.appendChild(header);
    section.appendChild(logContainer);
    
    return section;
  }

  function setupEventListeners() {
    // Minimize/Maximize
    document.getElementById('yt-auto-minimize-btn').addEventListener('click', () => {
      const content = document.getElementById('yt-auto-content');
      const btn = document.getElementById('yt-auto-minimize-btn');
      
      if (state.isMinimized) {
        content.style.display = 'block';
        btn.textContent = '−';
        state.isMinimized = false;
      } else {
        content.style.display = 'none';
        btn.textContent = '+';
        state.isMinimized = true;
      }
    });
    
    // Close panel
    document.getElementById('yt-auto-close-btn').addEventListener('click', () => {
      if (state.isRunning && !confirm('Automation is running. Are you sure you want to close?')) {
        return;
      }
      state.isStopped = true;
      document.getElementById('yt-subtitle-automator-panel').remove();
    });
    
    // Start button
    document.getElementById('yt-auto-start-btn').addEventListener('click', () => {
      // Update selected languages
      const checkboxes = document.querySelectorAll('.yt-auto-lang-checkbox');
      state.selectedLanguages = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);
      
      if (state.selectedLanguages.length === 0) {
        alert('Please select at least one language!');
        return;
      }
      
      document.getElementById('yt-auto-start-btn').style.display = 'none';
      addLog('Automation started', 'success');
      run();
    });
    
    // Pause button
    document.getElementById('yt-auto-pause-btn').addEventListener('click', () => {
      state.isPaused = true;
      document.getElementById('yt-auto-pause-btn').style.display = 'none';
      document.getElementById('yt-auto-resume-btn').style.display = 'block';
      updateStep('⏸ Paused');
      addLog('Paused by user', 'warning');
    });
    
    // Resume button
    document.getElementById('yt-auto-resume-btn').addEventListener('click', () => {
      state.isPaused = false;
      document.getElementById('yt-auto-pause-btn').style.display = 'block';
      document.getElementById('yt-auto-resume-btn').style.display = 'none';
      updateStep('▶ Resuming...');
      addLog('Resumed', 'success');
    });
    
    // Stop button
    document.getElementById('yt-auto-stop-btn').addEventListener('click', () => {
      if (confirm('Are you sure you want to stop the automation?')) {
        state.isStopped = true;
        state.isRunning = false;
        updateStep('⏹ Stopped by user');
        addLog('Stopped by user', 'error');
        playSound('error');
      }
    });
    
    // Skip current language
    document.getElementById('yt-auto-skip-btn').addEventListener('click', () => {
      if (state.isRunning && state.currentStep) {
        const currentLang = CONFIG.languages[state.currentLanguageIndex];
        state.skippedLanguages.push(currentLang);
        state.currentLanguageIndex++;
        addLog(`Skipped ${currentLang}`, 'warning');
        updateStep('⏭ Skipped, moving to next...');
      }
    });
    
    // Retry current language
    document.getElementById('yt-auto-retry-btn').addEventListener('click', () => {
      if (state.isRunning) {
        addLog('Retrying current language', 'info');
        updateStep('🔁 Retrying...');
      }
    });
    
    // Select All languages
    document.getElementById('yt-auto-select-all').addEventListener('click', () => {
      document.querySelectorAll('.yt-auto-lang-checkbox').forEach(cb => cb.checked = true);
      state.selectedLanguages = [...CONFIG.languages];
      addLog('All languages selected', 'info');
    });
    
    // Select None
    document.getElementById('yt-auto-select-none').addEventListener('click', () => {
      document.querySelectorAll('.yt-auto-lang-checkbox').forEach(cb => cb.checked = false);
      state.selectedLanguages = [];
      addLog('All languages deselected', 'info');
    });
    
    // Language checkbox changes
    document.querySelectorAll('.yt-auto-lang-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          if (!state.selectedLanguages.includes(e.target.value)) {
            state.selectedLanguages.push(e.target.value);
          }
        } else {
          state.selectedLanguages = state.selectedLanguages.filter(l => l !== e.target.value);
        }
        updateUI();
      });
    });
    
    // Speed slider
    document.getElementById('yt-auto-speed-slider').addEventListener('input', (e) => {
      const value = parseFloat(e.target.value);
      CONFIG.speedMultiplier = value;
      
      const labels = { 0.5: 'Fast', 1: 'Normal', 1.5: 'Slow', 2: 'Very Slow' };
      document.getElementById('yt-auto-speed-value').textContent = labels[value] || 'Normal';
      
      addLog(`Speed set to ${labels[value]}`, 'info');
    });
    
    // Retry attempts input
    document.getElementById('yt-auto-retry-input').addEventListener('change', (e) => {
      CONFIG.retryAttempts = parseInt(e.target.value) || 3;
      addLog(`Retry attempts set to ${CONFIG.retryAttempts}`, 'info');
    });
    
    // Sound toggle
    document.getElementById('yt-auto-sound-toggle').addEventListener('change', (e) => {
      CONFIG.soundEnabled = e.target.checked;
      addLog(`Sound notifications ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
      if (e.target.checked) {
        playSound('success');
      }
    });
    
    // Auto-save toggle
    document.getElementById('yt-auto-save-toggle').addEventListener('change', (e) => {
      CONFIG.autoSaveState = e.target.checked;
      addLog(`Auto-save ${e.target.checked ? 'enabled' : 'disabled'}`, 'info');
    });
    
    // Export button
    document.getElementById('yt-auto-export-btn').addEventListener('click', () => {
      exportResults();
    });
    
    // Settings toggle
    document.getElementById('yt-auto-settings-toggle').addEventListener('click', () => {
      const content = document.getElementById('yt-auto-settings-content');
      if (content.style.display === 'none') {
        content.style.display = 'block';
      } else {
        content.style.display = 'none';
      }
    });
    
    // Log toggle
    document.getElementById('yt-auto-log-toggle').addEventListener('click', () => {
      const container = document.getElementById('yt-auto-log-container');
      if (container.style.display === 'none') {
        container.style.display = 'block';
        updateLogDisplay();
      } else {
        container.style.display = 'none';
      }
    });
    
    // Clear log
    document.getElementById('yt-auto-clear-log').addEventListener('click', () => {
      state.logs = [];
      updateLogDisplay();
      addLog('Log cleared', 'info');
    });
    
    // Hover effects for all buttons
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(btn => {
      const originalBg = btn.style.background;
      btn.addEventListener('mouseenter', () => {
        if (!btn.style.background.includes('gradient')) {
          btn.style.background = btn.style.background.replace(/0\.\d+/, '1');
        }
        btn.style.transform = 'scale(1.05)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = originalBg;
        btn.style.transform = 'scale(1)';
      });
    });
  }

  // Update UI
  function updateUI(language, step, progress) {
    document.getElementById('yt-auto-current-lang').textContent = language || 'Ready to start';
    document.getElementById('yt-auto-current-step').textContent = step || 'Waiting...';
    
    const totalSelected = state.selectedLanguages.length;
    const progressPercent = totalSelected > 0 ? (progress / totalSelected) * 100 : 0;
    
    document.getElementById('yt-auto-progress-bar').style.width = `${progressPercent}%`;
    document.getElementById('yt-auto-progress-text').textContent = `${progress}/${totalSelected}`;
    
    // Update ETA
    const eta = estimateTimeRemaining();
    document.getElementById('yt-auto-eta').textContent = eta !== 'Calculating...' ? `ETA: ${eta}` : '';
    
    // Color-code progress bar
    const progressBar = document.getElementById('yt-auto-progress-bar');
    if (progressPercent < 33) {
      progressBar.style.background = '#f87171'; // Red
    } else if (progressPercent < 66) {
      progressBar.style.background = '#fbbf24'; // Yellow
    } else {
      progressBar.style.background = '#4ade80'; // Green
    }
  }

  function updateStep(step) {
    state.currentStep = step;
    document.getElementById('yt-auto-current-step').textContent = step;
    console.log(`[Step] ${step}`);
    addLog(step, 'info');
  }

  // Main workflow for a single language
  async function processLanguage(language) {
    const progress = state.completedLanguages.length + state.skippedLanguages.length + 1;
    updateUI(language, 'Starting...', progress);
    console.log(`\n===== Processing: ${language} =====`);
    addLog(`Processing: ${language}`, 'info');

    try {
      // Apply speed multiplier to wait times
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms * CONFIG.speedMultiplier));
      
      // Step 1: Click "Add language" button
      updateStep('1/8: Finding "Add language" button...');
      const addLangButton = await waitForElement(
        (root) => {
          // Look for button with text "Add language" or similar
          const buttons = Array.from(root.querySelectorAll('ytcp-button, button, tp-yt-paper-button'));
          return buttons.find(btn => 
            btn.textContent.trim().toLowerCase().includes('add language') ||
            btn.getAttribute('aria-label')?.toLowerCase().includes('add language')
          );
        },
        { timeout: 10000 }
      );
      await safeClick(addLangButton, '"Add language" button');

      // Step 2: Wait for dropdown and select language
      updateStep(`2/8: Selecting "${language}" from dropdown...`);
      await wait(1000);
      
      const languageOption = await waitForElement(
        (root) => {
          // Look for the language in dropdown items
          const items = Array.from(root.querySelectorAll('ytcp-ve, tp-yt-paper-item, [role="option"], [role="menuitem"]'));
          return items.find(item => 
            item.textContent.trim().toLowerCase() === language.toLowerCase() ||
            item.textContent.trim().includes(language)
          );
        },
        { timeout: 10000 }
      );
      await safeClick(languageOption, `Language option: ${language}`);

      // Step 3: Wait for captions editor to load
      updateStep('3/8: Waiting for captions editor...');
      await wait(2000);

      // Step 4: Click "Add" under Manual subtitles
      updateStep('4/8: Finding "Add" button for manual subtitles...');
      const addButton = await waitForElement(
        (root) => {
          const buttons = Array.from(root.querySelectorAll('ytcp-button, button, tp-yt-paper-button'));
          return buttons.find(btn => {
            const text = btn.textContent.trim().toLowerCase();
            const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
            // Must be exactly "add" (not "add language" or other variations)
            return (text === 'add' || ariaLabel === 'add') && 
                   !btn.disabled &&
                   !text.includes('language'); // Exclude "Add language" button
          });
        },
        { timeout: 10000, checkEnabled: true }
      );
      await safeClick(addButton, '"Add" button for manual subtitles');

      // Step 5: Wait for next options screen
      updateStep('5/8: Waiting for subtitle options...');
      await wait(1500);

      // Step 6: Click "Auto-translate"
      updateStep('6/8: Finding "Auto-translate" button...');
      const autoTranslateButton = await waitForElement(
        (root) => {
          const buttons = Array.from(root.querySelectorAll('ytcp-button, button, tp-yt-paper-button, [role="button"]'));
          return buttons.find(btn => 
            btn.textContent.trim().toLowerCase().includes('auto-translate') ||
            btn.textContent.trim().toLowerCase().includes('auto translate')
          );
        },
        { timeout: 10000 }
      );
      await safeClick(autoTranslateButton, '"Auto-translate" button');

      // Step 7: Wait for translation to finish (Publish button becomes enabled)
      updateStep('7/8: Waiting for translation to complete...');
      const publishButton = await waitForElement(
        (root) => {
          const buttons = Array.from(root.querySelectorAll('ytcp-button, button, tp-yt-paper-button'));
          return buttons.find(btn => {
            const text = btn.textContent.trim().toLowerCase();
            return text.includes('publish') && !btn.disabled;
          });
        },
        { timeout: CONFIG.maxWaitTime, checkEnabled: true }
      );

      // Step 8: Click Publish
      updateStep('8/8: Publishing subtitles...');
      await safeClick(publishButton, '"Publish" button');

      // Step 9: Wait to return to translations page
      updateStep('Waiting to return to translations page...');
      await wait(3000);

      console.log(`✅ Successfully processed: ${language}`);
      addLog(`✅ Completed: ${language}`, 'success');
      playSound('success');
      
      state.completedLanguages.push(language);
      state.currentLanguageIndex++;
      saveState();
      
    } catch (error) {
      console.error(`❌ Error processing ${language}:`, error.message);
      addLog(`❌ Error: ${language} - ${error.message}`, 'error');
      state.errors.push({ language, error: error.message });
      playSound('error');
      throw error;
    }
  }

  // Main execution
  async function run() {
    if (state.isRunning) {
      console.warn('Already running');
      return;
    }

    state.isRunning = true;
    state.startTime = Date.now();
    
    addLog('🚀 Automation initialized', 'success');

    try {
      // Verify we're on the right page
      if (!window.location.href.includes('studio.youtube.com/video/') || 
          !window.location.href.includes('/translations')) {
        throw new Error('Please navigate to YouTube Studio translations page first');
      }

      // Filter to only process selected languages
      const languagesToProcess = CONFIG.languages.filter(lang => state.selectedLanguages.includes(lang));
      
      addLog(`Processing ${languagesToProcess.length} selected languages`, 'info');

      for (let i = 0; i < languagesToProcess.length; i++) {
        if (state.isStopped) {
          console.log('⏹ Automation stopped by user');
          addLog('⏹ Stopped by user', 'error');
          break;
        }

        const language = languagesToProcess[i];
        
        // Check if this language is already translated
        if (isLanguageAlreadyTranslated(language)) {
          const progress = state.completedLanguages.length + state.skippedLanguages.length + 1;
          updateUI(language, '✓ Already completed - skipping', progress);
          state.skippedLanguages.push(language);
          addLog(`⏭ Skipped: ${language} (already done)`, 'warning');
          await new Promise(resolve => setTimeout(resolve, 1000 * CONFIG.speedMultiplier));
          continue;
        }
        
        let attempts = 0;
        let success = false;
        
        while (attempts < CONFIG.retryAttempts && !success && !state.isStopped) {
          try {
            await processLanguage(language);
            success = true;
          } catch (error) {
            attempts++;
            console.warn(`Retry ${attempts}/${CONFIG.retryAttempts} for ${language}`);
            addLog(`Retry ${attempts}/${CONFIG.retryAttempts} for ${language}`, 'warning');
            
            if (attempts >= CONFIG.retryAttempts) {
              updateStep(`❌ Failed after ${CONFIG.retryAttempts} attempts`);
              console.error(`Failed to process ${language} after ${CONFIG.retryAttempts} attempts`);
              addLog(`❌ Failed: ${language} after ${CONFIG.retryAttempts} attempts`, 'error');
              
              // Ask user if they want to continue with next language
              const continueNext = confirm(
                `Failed to process ${language} after ${CONFIG.retryAttempts} attempts.\n\nContinue with next language?`
              );
              
              if (!continueNext) {
                state.isStopped = true;
                break;
              }
            } else {
              await new Promise(resolve => setTimeout(resolve, 2000 * CONFIG.speedMultiplier));
            }
          }
        }
      }

      if (!state.isStopped) {
        updateStep('✅ All languages processed!');
        console.log('\n✅ Automation completed successfully!');
        addLog('🎉 Automation completed successfully!', 'success');
        playSound('complete');
        
        // Show summary
        const summary = `
Completed: ${state.completedLanguages.length}
Skipped: ${state.skippedLanguages.length}
Errors: ${state.errors.length}
Total Time: ${Math.round((Date.now() - state.startTime) / 1000)}s
        `.trim();
        
        addLog(summary, 'success');
        
        if (state.errors.length > 0) {
          console.warn('Errors encountered:', state.errors);
          addLog(`⚠️ ${state.errors.length} errors encountered - check console`, 'warning');
        }
        
        // Clear saved state on successful completion
        if (state.errors.length === 0) {
          clearState();
        }
      }

    } catch (error) {
      updateStep(`❌ Fatal error: ${error.message}`);
      console.error('Fatal error:', error);
      addLog(`❌ Fatal error: ${error.message}`, 'error');
      playSound('error');
    } finally {
      state.isRunning = false;
      document.getElementById('yt-auto-start-btn').style.display = 'block';
    }
  }

  // Set global flag
  window.YTSubtitleAutomator = {
    run,
    state,
    stop: () => { state.isStopped = true; },
    config: CONFIG
  };

  // Initialize UI but don't auto-start
  createUI();
  addLog('Ready to start! Select languages and click Start.', 'info');

})();
