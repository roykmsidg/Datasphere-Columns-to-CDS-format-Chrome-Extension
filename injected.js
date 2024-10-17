console.log('Injected script loaded');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getTableData(table) {
  console.log('Attempting to get table data');

  const binding = table.getBinding('rows');
  if (binding) {
      console.log('Binding found');
      const context = binding.getContexts();
      if (context && context.length > 0) {
          return context.map(c => c.getObject());
      }
  }

  const model = table.getModel();
  if (model) {
      console.log('Model found');
      const data = model.getData();
      if (Array.isArray(data)) {
          return data;
      } else if (typeof data === 'object') {
          for (let key in data) {
              if (Array.isArray(data[key])) {
                  return data[key];
              }
          }
      }
  }

  console.log('Unable to retrieve data from binding or model');
  return null;
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
    // console.log('Scrolled to:', scrollContainer.scrollTop);
  }
}

function extractValue(item) {
  if (item.__displayType && typeof item.__displayType === 'object' && 'value' in item.__displayType) {
      return item.__displayType.value;
  } else if (item.length !== undefined) {
      return item.length;
  } else {
      return '';
  }
}

function extractDataFromModel() {
  console.log('Extracting data from model');
  const table = sap.ui.getCore().byId("shellMainContent---databuilderComponent---databuilderWorkbench--graphSplitView--PropertyPanel--ermodeler-properties-EntityProperties--EntityPropertiesView--editAttributesDialogView--editModeBusinessAttributesTable");

  if (!table) {
      console.error('Table not found');
      return [];
  }

  const data = getTableData(table);

  if (!data) {
      console.error('No data found in table');
      return [];
  }

  console.log('Data found:', data);

  return data.map(item => {

      return {
          isKey: item.isKey,
          technicalName: item.technicalName || item.name,
          dataType: item.dataType || item.type,
          description: item.description,
          length: extractValue(item)
      };
  });
}

function formatResult(data) {
  return data.map(item => {
      let dataType = item.dataType;
      // Remove 'cds.' prefix if it exists
      if (dataType.startsWith('cds.')) {
          dataType = dataType.substring(4);
      }
      // Ensure the technical name is padded to a length of 20 characters
      const paddedName = item.technicalName.padEnd(20);
      const lengthValue = item.length !== undefined && item.length !== '' ? item.length : '';
      return `${item.isKey ? 'key ' : '   '}${paddedName}: ${extractValue(item)};`;
  });
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

  try {
      const data = extractDataFromModel();
      const result = formatResult(data);

      console.log(`Extracted ${result.length} rows`);
      console.log(result.join('\n'));
      
      showCustomDialog(result);

      // Send the extracted data to the background script
      chrome.runtime.sendMessage(myExtId, {
          action: "extractedData",
          data: result
      }, response => {

      });
  } catch (error) {
      console.error('Error during data extraction:', error);
      alert('An error occurred during data extraction. Check the console for details.');
  }
}

function showCustomDialog(result) {
  // Create dialog elements
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 10000;
  `;

  const message = document.createElement('p');
  message.textContent = `Data extracted! ${result.length} rows found.`;

  const copyButton = document.createElement('button');
  copyButton.textContent = 'Copy to Clipboard';
  copyButton.style.marginRight = '10px';
  copyButton.onclick = () => {
    navigator.clipboard.writeText(result.join('\n'))
      .then(() => {
        copyButton.textContent = 'Copied!';
        setTimeout(() => copyButton.textContent = 'Copy to Clipboard', 2000);
      })
      .catch(err => console.error('Failed to copy: ', err));
  };

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.onclick = () => document.body.removeChild(dialog);

  // Assemble and show dialog
  dialog.appendChild(message);
  dialog.appendChild(copyButton);
  dialog.appendChild(closeButton);
  document.body.appendChild(dialog);
}

function showErrorDialog(errorMessage) {
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    z-index: 10000;
  `;

  const message = document.createElement('p');
  message.textContent = errorMessage;

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.onclick = () => document.body.removeChild(dialog);

  dialog.appendChild(message);
  dialog.appendChild(closeButton);
  document.body.appendChild(dialog);
}

// We need to wait for the UI5 core to be initialized
if (sap && sap.ui && sap.ui.getCore()) {
  sap.ui.getCore().attachInit(function() {
      // Start extraction when UI5 is ready
      extractData();
  });
} else {
  console.error('SAP UI5 not found on this page');
}
