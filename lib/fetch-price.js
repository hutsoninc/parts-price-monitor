const { JSDOM } = require('jsdom');
const fetch = require('fetch-retry');

const baseUrl =
    'https://www.johndeerestore.com/jdb2cstorefront/JohnDeereStore/en/p/';

const fetchPrice = async sku => {
    const url = `${baseUrl}${sku}`;

    try {
        const html = await fetch(url, {
            method: 'GET',
        }).then(res => {
            return res.text();
        });

        const dom = new JSDOM(html);
        const window = dom.window;
        const { document } = window;

        const priceStr = document.querySelector('.price').textContent;

        const price = Number(priceStr.replace(/[^\d\.]/g, ''));

        if (isNaN(price)) {
            return {
                sku,
                error: true,
            };
        }

        return {
            sku,
            price,
        };
    } catch (err) {
        return {
            sku,
            error: true,
        };
    }
};

module.exports = fetchPrice;
