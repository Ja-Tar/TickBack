// Testing tasks counter badge

const issues = document.querySelectorAll("li[role='listitem']");

issues.forEach((issue) => {
    const title = issue.querySelector("[class*='Title-module__container']");
    if (!title) return;
    const trailingBadgesContainer = title.querySelector("[class*='Title-module__trailingBadgesContainer']");
    if (!trailingBadgesContainer) return;

    const counterDiv = document.createElement("div");
    counterDiv.style.display = "inline-block";
    counterDiv.style.marginRight = "var(--base-size-4)";
    counterDiv.style.maxWidth = "100%";
    counterDiv.style.verticalAlign = "text-top";
    counterDiv.style.height = "auto";

    const counterBorder = document.createElement("span");
    counterBorder.style.borderWidth = "1px";
    counterBorder.style.borderColor = "var(--borderColor-muted,var(--color-border-muted))";
    counterBorder.style.borderStyle = "solid";
    counterBorder.style.maxWidth = "100%";
    counterBorder.style.borderRadius = "var(--borderRadius-full,624.9375rem)";
    counterBorder.style.fontSize = "var(--text-body-size-small,.75rem)";
    counterBorder.style.height = "20px";
    counterBorder.style.lineHeight = "20px";

    const counterText = document.createElement("span");
    counterText.innerHTML = "0 / 2";
    counterText.style.margin = "0 8px";
    counterText.style.fontSize = "var(--text-body-size-small,.75rem)";
    counterText.style.lineHeight = "20px";
    counterText.style.fontWeight = "var(--base-text-weight-semibold,600)";


    counterBorder.appendChild(counterText);
    counterDiv.appendChild(counterBorder);
    trailingBadgesContainer.prepend(counterDiv);
});