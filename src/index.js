require('dotenv').config();
const { google } = require('googleapis');
const authorize = require('./authorize');
const fetchPrices = require('../lib');

const SHEET_NAME = 'Data';

const isDefined = val => {
    return typeof val !== 'undefined' && val !== null;
};

// 1 indexed
const getColName = num => {
    let ret = '';
    for (a = 1, b = 26; (num -= a) >= 0; a = b, b *= 26) {
        ret = String.fromCharCode(parseInt((num % b) / a) + 65) + ret;
    }
    return ret;
};

const main = async () => {
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!isDefined(spreadsheetId)) {
        console.error(
            'No Spreadsheet ID provided. Add one to the `.env` file using the template in `.env.template`.'
        );
        return null;
    }

    try {
        // Authorize
        const auth = await authorize();

        const sheets = google.sheets({ version: 'v4', auth });

        const rows = [];

        // Retrieve list of skus to fetch prices for
        const skus = await sheets.spreadsheets.values
            .get({
                spreadsheetId,
                range: `${SHEET_NAME}!A:Z`,
            })
            .then(res => {
                rows.push(...res.data.values);

                // Find SKU column index
                const skuColIndex = rows[0].findIndex(val => /sku/i.test(val));

                // Retrun skus
                return rows.reduce((acc, row, index) => {
                    if (index !== 0) {
                        acc.push(row[skuColIndex]);
                    }
                    return acc;
                }, []);
            });

        // Fetch prices for skus
        const data = await fetchPrices(skus);

        const lastUpdate = new Date().toLocaleString('en-US', {
            timeZone: 'America/Chicago',
        });

        // Update prices in spreadsheet
        const priceColIndex = rows[0].findIndex(val => /price/i.test(val));
        const priceColName = getColName(priceColIndex + 1);
        const priceRange = `${SHEET_NAME}!${priceColName}2:${priceColName}${data.length +
            1}`;

        const priceValues = data.map((val, i) => {
            if (val.error || !isDefined(val.price)) {
                // Use current value
                return String(rows[i + 1][priceColIndex]);
            } else {
                return String(val.price);
            }
        });

        const lastUpdateColIndex = rows[0].findIndex(val =>
            /last\supdate/i.test(val)
        );
        const lastUpdateColName = getColName(lastUpdateColIndex + 1);
        const lastUpdateRange = `${SHEET_NAME}!${lastUpdateColName}2:${lastUpdateColName}${data.length +
            1}`;

        const lastUpdateValues = Array.from({ length: data.length }).fill(
            lastUpdate
        );

        await sheets.spreadsheets.values
            .batchUpdate({
                spreadsheetId,
                resource: {
                    valueInputOption: 'USER_ENTERED',
                    data: [
                        {
                            range: priceRange,
                            majorDimension: 'COLUMNS',
                            values: [priceValues],
                        },
                        {
                            range: lastUpdateRange,
                            majorDimension: 'COLUMNS',
                            values: [lastUpdateValues],
                        },
                    ],
                },
            })
            .then(res => {
                console.log(`${res.data.totalUpdatedCells} cells updated`);
            });
    } catch (err) {
        console.error(JSON.stringify(err, null, 2));
    }
};

main();
