const getMarginForecast = require("./server-actions/getMarginForecast.js");
const callClaude = require("./server-actions/callClaude.js");

const serverActions = [
  {
    name: "getMarginForecast",
    description: "Fetches all projects from Rocketlane, computes EAC, forecast margin, risk level, and signals for each project. Returns a sorted portfolio object ready for the widget to render.",
    run: getMarginForecast.run,
  },
  {
    name: "callClaude",
    description: "Calls the Anthropic Claude API to generate risk briefs and action plans.",
    run: callClaude.run,
  },
];

const widgets = [
  {
    location: ["left_nav"],
    name: "Margin Slip Detector",
    label: "Margin Forecast",
    description: "Live P&L forecasting — EAC, forecast margin, risk signals, governance alerts, and action playbooks for this project.",
    icon: "widgets/margin-slip-detector/logo.png",
    entrypoint: {
      html: "widgets/margin-slip-detector/index.html",
    },
    identifier: "margin-slip-detector",
    logo: "widgets/margin-slip-detector/logo.png",
  },
];

module.exports = {
  widgets,
  serverActions,
  version: "1.0.2",
  installationFields: () => {
    return [
      {
        name: "billableRate",
        label: "Billable rate ($/hour)",
        type: "NUMBER",
        required: false,
        rerenderAllFields: false,
        defaultValue: 150,
        secure: false,
        hidden: false,
        metaData: { range: { min: 50, max: 500 } },
      },
      {
        name: "costRate",
        label: "Cost rate ($/hour)",
        type: "NUMBER",
        required: false,
        rerenderAllFields: false,
        defaultValue: 100,
        secure: false,
        hidden: false,
        metaData: { range: { min: 30, max: 400 } },
      },
      {
        name: "targetMargin",
        label: "Target margin (%)",
        type: "NUMBER",
        required: false,
        rerenderAllFields: false,
        defaultValue: 20,
        secure: false,
        hidden: false,
        metaData: { range: { min: 5, max: 60 } },
      },
      {
        name: "anthropicApiKey",
        label: "Anthropic API Key",
        type: "TEXT",
        required: false,
        rerenderAllFields: false,
        defaultValue: "",
        secure: true,
        hidden: false,
      },
    ];
  },
};
