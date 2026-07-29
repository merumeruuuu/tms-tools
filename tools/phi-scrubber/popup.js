document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const tabText = document.getElementById('tab-text');
  const tabFile = document.getElementById('tab-file');
  const viewText = document.getElementById('view-text');
  const viewFile = document.getElementById('view-file');
  
  const rawText = document.getElementById('raw-text');
  const cleanText = document.getElementById('clean-text');
  const fileUpload = document.getElementById('file-upload');
  const fileStatus = document.getElementById('file-status');

  // Dummy Data Inputs
  const dummyName = document.getElementById('dummy-name');
  const dummySsn = document.getElementById('dummy-ssn');
  const dummyContact = document.getElementById('dummy-contact');

  // Tab Switching Logic
  tabText.addEventListener('click', () => {
    tabText.classList.add('active');
    tabFile.classList.remove('active');
    viewText.classList.add('active');
    viewText.classList.remove('hidden');
    viewFile.classList.add('hidden');
    viewFile.classList.remove('active');
  });

  tabFile.addEventListener('click', () => {
    tabFile.classList.add('active');
    tabText.classList.remove('active');
    viewFile.classList.add('active');
    viewFile.classList.remove('hidden');
    viewText.classList.add('hidden');
    viewText.classList.remove('active');
  });

  // Core Scrubber Function
  function scrubData(text) {
    let scrubbed = text;

    // 1. SSN Pattern (XXX-XX-XXXX or XXXXXXXXX)
    const ssnRegex = /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g;
    scrubbed = scrubbed.replace(ssnRegex, dummySsn.value);

    // 2. Email Pattern
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    scrubbed = scrubbed.replace(emailRegex, dummyContact.value);

    // 3. Phone Pattern (US centric for example)
    const phoneRegex = /(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})/g;
    scrubbed = scrubbed.replace(phoneRegex, dummyContact.value);

    // 4. Basic Name Heuristics (Capitalized words near prefixes - basic example)
    // NOTE: True name NER is highly complex. This is a naive regex for demonstration.
    const nameRegex = /\b(?:Mr\.|Mrs\.|Ms\.|Dr\.)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/g;
    scrubbed = scrubbed.replace(nameRegex, dummyName.value);

    // Add Date of Birth patterns, MRN patterns, etc., as needed based on your dataset.

    return scrubbed;
  }

  // Handle Text Scrubbing
  document.getElementById('btn-scrub-text').addEventListener('click', () => {
    const input = rawText.value;
    if (!input) return;
    cleanText.value = scrubData(input);
  });

  // Handle Clipboard Copy
  document.getElementById('btn-copy').addEventListener('click', () => {
    if (!cleanText.value) return;
    navigator.clipboard.writeText(cleanText.value).then(() => {
      const btn = document.getElementById('btn-copy');
      btn.innerText = "Copied!";
      setTimeout(() => btn.innerText = "Copy to Clipboard", 2000);
    });
  });

  // Handle File Scrubbing & Download
  document.getElementById('btn-scrub-file').addEventListener('click', () => {
    const file = fileUpload.files[0];
    if (!file) {
      fileStatus.innerText = "Please select a file first.";
      fileStatus.style.color = "red";
      return;
    }

    const reader = new FileReader();
    
    reader.onload = function(e) {
      const content = e.target.result;
      const scrubbedContent = scrubData(content);
      
      // Create a Blob and trigger download
      const blob = new Blob([scrubbedContent], { type: file.type || 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Use Chrome Downloads API to download the file
      chrome.downloads.download({
        url: url,
        filename: `scrubbed_${file.name}`,
        saveAs: true
      }, () => {
        fileStatus.innerText = "File scrubbed and downloaded successfully!";
        fileStatus.style.color = "#059669";
        URL.revokeObjectURL(url); // Clean up memory
      });
    };

    reader.onerror = function() {
      fileStatus.innerText = "Error reading file.";
      fileStatus.style.color = "red";
    };
    function autoFormatHL7(text) {
  const trimmedText = text.trim();

  // 1. Check if it's actually an HL7 message
  if (!trimmedText.startsWith('MSH')) {
    return text; // Not HL7, return as is
  }

  // 2. Check if it's already formatted properly
  // If it has multiple line breaks, we assume it doesn't need flattening recovery
  const lineCount = trimmedText.split(/[\r\n]+/).length;
  if (lineCount > 2) {
    return text;
  }

  // 3. The Heuristic Formatter
  // Looks for 3 uppercase letters/numbers followed by a pipe (e.g., PID|, Z01|)
  // The (?<!^) ensures we don't put a newline before the very first MSH|
  // The \s* consumes any stray spaces that might have replaced the carriage returns
  const segmentPattern = /(?<!^)\s*([A-Z][A-Z0-9]{2}\|)/g;
  
  // Replace the match by adding a newline right before the segment name
  const formattedText = trimmedText.replace(segmentPattern, '\n$1');
  
  return formattedText;
}
    reader.readAsText(file); // Note: Only works for text-based files (txt, csv, json)
  });
});