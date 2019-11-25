const Promise = require('bluebird');
const Bottleneck = require('bottleneck');
const { defaultsDeep } = require('lodash');
const fetchPrice = require('./fetch-price');

const defaultOptions = {
    bottleneckOptions: {
        maxConcurrent: 2,
        minTime: 1000 / 9,
    },
};

const isDefined = val => {
    return typeof val !== 'undefined' && val !== null;
};

/**
 *
 * @param {Array} skus Part SKUs
 * @param {Object} options Options
 */

const main = async (skus, options = {}) => {
    if (!Array.isArray(skus)) {
        throw new Error(`Must provide array of part skus`);
    }

    options = defaultsDeep({}, options, defaultOptions);

    const limiter = new Bottleneck(options.bottleneckOptions);

    // Fetch data
    const promises = skus.map(async sku => {
        return limiter.schedule(async () => await fetchPrice(sku, options));
    });

    const data = await Promise.all(promises);

    const dataFiltered = data.filter(isDefined);

    return dataFiltered;
};

module.exports = main;
