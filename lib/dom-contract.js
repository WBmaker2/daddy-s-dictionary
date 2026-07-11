function requireElement(selector, root = document) {
  const element = root.querySelector(selector);

  if (!element) {
    throw new Error(`Missing required DOM element: ${selector}`);
  }

  return element;
}

const TOP_LEVEL_SELECTORS = {
  input: "#search-input",
  category: "#category-select",
  results: "#results",
  loadMoreButton: "#load-more-button",
  clearButton: "#clear-button",
  statusText: "#status-text",
  resultCount: "#result-count",
  banner: "#pronunciation-banner",
  dataWarning: "#data-warning",
  template: "#result-card-template",
  statElementary: "#stat-elementary",
  statMiddle: "#stat-middle",
  statHigh: "#stat-high",
  statElementaryExpressions: "#stat-elementary-expressions",
  statMiddleExpressions: "#stat-middle-expressions",
  statSupplemental: "#stat-supplemental",
  heroTotalChip: "#hero-total-chip",
  offlineStatusChip: "#offline-status-chip",
  infoSummaryText: "#info-summary-text"
};

const TEMPLATE_SELECTORS = {
  card: ".result-card",
  title: ".word-title",
  ipa: ".word-ipa",
  forms: ".word-forms",
  badge: ".category-badge",
  glossList: ".gloss-list",
  detailHeading: ".detail-heading",
  definitionList: ".definition-list",
  speakButton: ".speak-button",
  checkButton: ".check-button",
  feedback: ".feedback-text"
};

function createTemplateSubnodeRefs(templateRoot) {
  return Object.fromEntries(
    Object.entries(TEMPLATE_SELECTORS).map(([key, selector]) => [
      key,
      requireElement(selector, templateRoot)
    ])
  );
}

function createDomRefs(root = document) {
  const template = requireElement(TOP_LEVEL_SELECTORS.template, root);
  const templateSubnodes = createTemplateSubnodeRefs(template.content);

  return {
    input: requireElement(TOP_LEVEL_SELECTORS.input, root),
    category: requireElement(TOP_LEVEL_SELECTORS.category, root),
    results: requireElement(TOP_LEVEL_SELECTORS.results, root),
    loadMoreButton: requireElement(TOP_LEVEL_SELECTORS.loadMoreButton, root),
    clearButton: requireElement(TOP_LEVEL_SELECTORS.clearButton, root),
    statusText: requireElement(TOP_LEVEL_SELECTORS.statusText, root),
    resultCount: requireElement(TOP_LEVEL_SELECTORS.resultCount, root),
    banner: requireElement(TOP_LEVEL_SELECTORS.banner, root),
    dataWarning: requireElement(TOP_LEVEL_SELECTORS.dataWarning, root),
    template,
    templateSubnodes,
    stats: {
      elementary: requireElement(TOP_LEVEL_SELECTORS.statElementary, root),
      middle: requireElement(TOP_LEVEL_SELECTORS.statMiddle, root),
      high: requireElement(TOP_LEVEL_SELECTORS.statHigh, root),
      "elementary-expressions": requireElement(
        TOP_LEVEL_SELECTORS.statElementaryExpressions,
        root
      ),
      "middle-expressions": requireElement(
        TOP_LEVEL_SELECTORS.statMiddleExpressions,
        root
      ),
      supplemental: requireElement(TOP_LEVEL_SELECTORS.statSupplemental, root)
    },
    heroTotalChip: root.querySelector(TOP_LEVEL_SELECTORS.heroTotalChip),
    offlineStatusChip: requireElement(TOP_LEVEL_SELECTORS.offlineStatusChip, root),
    infoSummaryText: root.querySelector(TOP_LEVEL_SELECTORS.infoSummaryText)
  };
}

export { createDomRefs, createTemplateSubnodeRefs, requireElement, TOP_LEVEL_SELECTORS, TEMPLATE_SELECTORS };
