function isPostDivider(post) {
  // Check if the cellInnerDiv has exactly one child
  const children = post.children;
  if (children.length !== 1) {
    return false;
  }

  // Check if the only child is a div
  const child = children[0];
  if (child.tagName !== "DIV") {
    return false;
  }

  // Check if the child div has no grandchildren
  return child.children.length === 0;
}

export { isPostDivider };