console.log('Injected script loaded');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function scrollTable() {
  const scrollContainer = document.querySelector('.sapUiTableVSb');
  if (!scrollContainer) {
    console.error('Scroll container not found');
    return;
  }

  let lastScrollTop = scrollContainer.scrollTop;
  let noChangeCount = 0;
  const maxNoChangeCount = 5;

  while (true) {
    scrollContainer.scrollTop += 100;
    await sleep(500);

    if (scrollContainer.scrollTop === lastScrollTop) {
      noChangeCount++;
      if (noChangeCount >= maxNoChangeCount) {
        console.log('Scrolling complete - no more content to load');
        break;
      }
    } else {
      noChangeCount = 0;
    }

    lastScrollTop = scrollContainer.scrollTop;
    console.log('Scrolled to:', scrollContainer.scrollTop);
  }
}

function extractRowData(row) {
  const isKey = row.querySelector('input[type="checkbox"]').checked;
  const description = row.querySelector('.sapMInputBaseInner:not([disabled])').value;
  const technicalName = row.querySelector('.sapMInputBaseInner[disabled]').value;
  const dataType = row.querySelector('.sapMBtnContent bdi').textContent;
  
  return { isKey, description, technicalName, dataType };
}

function extractVisibleRows() {
  const rows = document.querySelectorAll('tr[data-sap-ui^="shellMainContent---databuilderComponent---databuilderWorkbench--graphSplitView--PropertyPanel--ermodeler-properties-EntityProperties--EntityPropertiesView--editAttributesDialogView--editModeBusinessAttributesTable-rows-row"]');
  
  return Array.from(rows).map(extractRowData);
}

async function extractData() {
  console.log('Extracting data');
  
  await scrollTable();

  let allData = new Map();

  while (true) {
    const visibleRows = extractVisibleRows();
    let newDataFound = false;

    for (const rowData of visibleRows) {
      if (!allData.has(rowData.technicalName)) {
        allData.set(rowData.technicalName, rowData);
        newDataFound = true;
      }
    }

    if (!newDataFound) break;

    // Scroll a bit to load new rows
    const scrollContainer = document.querySelector('.sapUiTableVSb');
    scrollContainer.scrollTop += 100;
    await sleep(500);
  }

  const result = Array.from(allData.values()).map(data => 
    `${data.isKey ? 'key ' : ''}${data.technicalName} : ${data.dataType};`
  );

  console.log(result.join('\n'));
  alert(`Data extracted! ${result.length} rows found. Check the console for results.`);

  // Send the extracted data to the background script
  chrome.runtime.sendMessage(myExtId, {
    action: "extractedData",
    data: result
  }, response => {
    console.log("Response from background:", response);
  });
}

// Start extraction immediately when injected
extractData();