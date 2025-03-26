const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const timezone = require("dayjs/plugin/timezone");

// Extend Day.js with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

module.exports = function (eleventyConfig) {
    eleventyConfig.addLayoutAlias("default", "layouts/default.njk");
    // Debugging
    eleventyConfig.addPassthroughCopy({ "src/_data/deals.json": "deals.json" });

    // Add a filter to truncate text
    eleventyConfig.addFilter("truncate", (text, length = 100) => {
        if (!text) return "";
        return text.length > length ? text.substring(0, length) + "…" : text;
    });

    // Add buildDate as global data in two formats
    eleventyConfig.addGlobalData("buildDateISO", dayjs().utc().format()); // ISO 8601 format
    eleventyConfig.addGlobalData(
        "buildDateFormatted",
        dayjs().tz("America/New_York").format("MMMM D, YYYY [at] hh:mm:ss A [ET]") // Human-readable format
    );

    // Add MY_ENVIRONMENT as global data
    eleventyConfig.addGlobalData("environment", process.env.MY_ENVIRONMENT || "development");

    return {
        dir: {
            input: 'src',
            includes: '_includes',
            output: 'public',
        },
        templateFormats: ['md', 'njk', 'html'],
        markdownTemplateEngine: 'njk',
        htmlTemplateEngine: 'njk',
        dataTemplateEngine: 'njk'
    };
};