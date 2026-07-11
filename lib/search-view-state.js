function createSearchViewState({ initialLimit, pageSize }) {
  let limit = initialLimit;

  return {
    get limit() {
      return limit;
    },
    reset() {
      limit = initialLimit;
    },
    showMore() {
      limit += pageSize;
    }
  };
}

export { createSearchViewState };
