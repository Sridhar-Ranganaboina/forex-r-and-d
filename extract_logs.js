// Function to convert month name to a number
function getMonthNumber(monthName) {
    const months = {
        JANUARY: "01", FEBRUARY: "02", MARCH: "03", APRIL: "04", MAY: "05",
        JUNE: "06", JULY: "07", AUGUST: "08", SEPTEMBER: "09", OCTOBER: "10",
        NOVEMBER: "11", DECEMBER: "12"
    };
    return months[monthName.toUpperCase()] || '';
}

// Select the parent div with class 'scrollContainer-RT_yiIRf'
let container = document.querySelector('.scrollContainer-RT_yiIRf');

// Check if the container exists
if (container) {
    // Find all divs with data-name="alert-log-item" and the date div with the specific classes
    let items = container.querySelectorAll('div[data-name="alert-log-item"]');
    let resultArray = [];
    let entryPricesMap = {};  // To track entry prices and trade numbers
    let tradeNumber = 1;  // Trade number counter

    // Add CSV headers
    resultArray.push(['Date', 'Time', 'DateTime', 'Entry Type', 'Current Price', 'Asset Name', 'Time Period', 'Categorized Type', 'Profit/Loss', 'Trade No'].join(','));

    // Extract data and add to resultArray
    items.forEach((alertDiv) => {
        // Find the previous sibling that matches the date div's classes
        let dateDiv = alertDiv.previousElementSibling;
        while (dateDiv && !dateDiv.classList.contains('label-cU4vU9Kj') && !dateDiv.classList.contains('label-Z31nwDQw')) {
            dateDiv = dateDiv.previousElementSibling;
        }

        // Extract time from the alertDiv outerText
        let timeMatch = alertDiv.outerText.match(/\d{2}:\d{2}:\d{2}/);
        let time = timeMatch ? timeMatch[0] : '';

        // Extract entry type details (matching for both Color and regular types)
        let entryTypeMatch = alertDiv.outerText.match(/(Entry|Exit)\s(Color\s)?(PE|CE)/);
        let entryType = entryTypeMatch ? `${entryTypeMatch[1]} ${entryTypeMatch[2] ? entryTypeMatch[2] : ''}${entryTypeMatch[3]}`.trim() : '';

        // Extract the additional categorization for CE/PE Entry/Exit
        let categorizedType = '';
        if (entryType.includes('CE')) {
            categorizedType = entryType.includes('Entry') ? 'CE Entry' : 'CE Exit';
        } else if (entryType.includes('PE')) {
            categorizedType = entryType.includes('Entry') ? 'PE Entry' : 'PE Exit';
        }

        let priceMatch = alertDiv.outerText.match(/@([\d.]+)/);
        let currentPrice = priceMatch ? parseFloat(priceMatch[1]) : '';

        let assetNameMatch = alertDiv.outerText.match(/XAUUSD|[\w]+/);  // Assuming Asset Name as 'XAUUSD' or similar
        let assetName = assetNameMatch ? assetNameMatch[0] : '';

        let timePeriodMatch = alertDiv.outerText.match(/(\d+m)/);  // Extracting the time period like '5m'
        let timePeriod = timePeriodMatch ? timePeriodMatch[0] : '';

        // If a matching date div is found, extract date and combine it with the time
        if (dateDiv && time) {
            let rawDate = dateDiv.outerText.trim();  // Extract date
            let [month, day] = rawDate.split(' ');  // Split the month and day

            // Convert month name to number and add year (2024)
            let monthNumber = getMonthNumber(month);
            let fullDate = `2024-${monthNumber}-${day.padStart(2, '0')}`;  // Format the date as YYYY-MM-DD

            // Combine date and time for full DateTime
            let dateTime = `${fullDate} ${time}`;  // Combine date and time for DateTime column

            // Push the data as a CSV row with Date, Time, DateTime, and categorized type
            resultArray.push([fullDate, time, dateTime, entryType, currentPrice, assetName, timePeriod, categorizedType, '', ''].join(','));
        }
    });

    // Extract the header row
    let header = resultArray.shift();

    // Sort resultArray by DateTime column (index 2) from oldest to newest
    resultArray.sort((a, b) => {
        let dateTimeA = new Date(a.split(',')[2]);
        let dateTimeB = new Date(b.split(',')[2]);
        return dateTimeA - dateTimeB;
    });

    // Initialize a map to track the entry prices and trade numbers
    let entryPrices = {};

    // Update resultArray with Profit/Loss and Trade No
    resultArray.forEach((row, index) => {
        let columns = row.split(',');
        let entryType = columns[3];
        let categorizedType = columns[7];
        let profitLoss = '';
        let tradeNo = '';

        if (entryType.includes('Entry')) {
            // Store the entry price and trade number for future matching exits
            entryPrices[entryType] = { price: columns[4], tradeNo: tradeNumber };
            tradeNo = tradeNumber;
            tradeNumber++;
        } else if (entryType.includes('Exit')) {
            let entryTypeKey = entryType.replace('Exit', 'Entry');  // Get corresponding entry type
            let entryData = entryPrices[entryTypeKey];
            if (entryData) {
                let entryPrice = entryData.price;
                tradeNo = entryData.tradeNo;
                if (categorizedType.includes('CE')) {
                    profitLoss = columns[4] > entryPrice ? `+${(columns[4] - entryPrice).toFixed(2)}` : `-${(entryPrice - columns[4]).toFixed(2)}`;
                } else if (categorizedType.includes('PE')) {
                    profitLoss = columns[4] < entryPrice ? `+${(entryPrice - columns[4]).toFixed(2)}` : `-${(columns[4] - entryPrice).toFixed(2)}`;
                }
                delete entryPrices[entryTypeKey];  // Remove the entry after matching with exit
            } else {
                profitLoss = 'invalid';  // Mark as invalid if no matching entry is found
            }
        }

        // Update the row with Profit/Loss and Trade No
        resultArray[index] = [columns[0], columns[1], columns[2], columns[3], columns[4], columns[5], columns[6], columns[7], profitLoss, tradeNo].join(',');
    });

    // Re-add the header row to the beginning
    resultArray.unshift(header);

    // Convert array to CSV format
    let csvContent = resultArray.join('\n');

    // Create a CSV file and download it
    let blob = new Blob([csvContent], { type: 'text/csv' });
    let link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'alert-log.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

} else {
    console.log('Container not found');
}
