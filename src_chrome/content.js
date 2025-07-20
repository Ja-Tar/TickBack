const tokenStatusText = {
    0: "Token is valid",
    1: "Token is not set",
    2: "Token is invalid",
    3: "Rate limit reached"
};

// Main script

async function getApiIssues(
    token,
    owner = 'Ja-Tar',
    repo = 'TickBack',
    query = 'state:open sort:created-desc type:issue',
    page = 1
) {
    const rateLimitInfo = await browser.storage.local.get(['tokenStatus', 'rateLimitRemaining', 'rateLimitReset'])
    let tokenStatus = rateLimitInfo.tokenStatus; // 0 = valid, 1 = not set, 2 = invalid, 3 = rate limited
    let rateLimitRemaining = rateLimitInfo.rateLimitRemaining;
    let rateLimitReset = rateLimitInfo.rateLimitReset;
    let after = "";

    if (tokenStatus !== 0) {
        console.warn(`Token status: ${tokenStatusText[tokenStatus]}`);
        return [];
    } else if (rateLimitRemaining <= 5) {
        const resetTime = new Date(rateLimitReset * 1000);
        if (resetTime <= new Date()) {
            console.debug('Rate limit reached, but reset time has passed. Fetching data...');
        } else {
            console.debug('Rate limit reached, waiting for reset time...');
            return [];
        }
    }

    if (page > 1) {
        // example value (base64): "cursor:25" -> "Y3Vyc29yOjI1"
        after = btoa(`cursor:${page * 25 - 25}`);
    }

    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            query: `
                    query search {
                        search(first: 25, after: "${after}", type: ISSUE, query: "repo:${owner}/${repo} ${query}") {
                            nodes {
                                ... on Issue {
                                    body
                                    number
                                }
                            }
                        }
                    }
                `
        })
    });

    const data = await response.json();

    // Check for rate limit headers
    if (data.message?.includes("Bad credentials")) {
        tokenStatus = 2; // Invalid token
        console.warn('Invalid token detected');
    }
    rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining'), 10);
    rateLimitReset = parseInt(response.headers.get('X-RateLimit-Reset'), 10);

    chrome.storage.local.set({
        tokenStatus,
        rateLimitRemaining,
        rateLimitReset
    }).catch((error) => {
        console.error('Error saving session data:', error);
    });

    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const combinedData = data.data.search.nodes.map(issue => ({
        body: issue.body,
        number: issue.number
    }));
    return combinedData.filter(issue => {
        if (!issue.body || issue.body.trim() === '') {
            console.debug(`Issue #${issue.number} has no body, skipping...`);
            return false;
        }
        return true;
    });

}

function getSingleIssueBody() {
    const issueBody = document.querySelector('div[data-testid*="issue-body"]');
    const markdownBody = issueBody.querySelector('div[data-testid*="markdown-body"]');
    const taskListUl = markdownBody.querySelectorAll('ul[class*="contains-task-list"]');
    if (!taskListUl || taskListUl.length === 0) {
        return null;
    }

    let openTaskCount = 0;
    let completedTaskCount = 0;

    for (let i = 0; i < taskListUl.length; i++) {
        const taskListDiv = taskListUl[i].querySelector('div[class*="base-list-item"]');
        const taskListItems = taskListDiv.children;
        const taskListNumber = taskListItems.length;
        for (let j = 0; j < taskListNumber; j++) {
            const taskItem = taskListItems[j];
            const checkbox = taskItem.querySelector('input[type="checkbox"]');
            if (checkbox) {
                if (checkbox.ariaChecked === 'true') {
                    completedTaskCount++;
                } else {
                    openTaskCount++;
                }
            }
        }
    }

    const allTaskCount = openTaskCount + completedTaskCount;
    if (allTaskCount === 0) {
        console.debug('No tasks found in issue body');
        return null;
    }
    const progress = (completedTaskCount / allTaskCount) * 100;

    return { allTaskCount, completedTaskCount, progress };
}

function getRepInfo() {
    const url = document.location.href;
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) {
        const owner = match[1];
        const repo = match[2];
        //console.log(`Repository Owner: ${owner}, Repository Name: ${repo}`);
        return { owner, repo };
    } else {
        console.error('Could not extract repository information from URL');
        return null;
    }
}

function getSearchFilters() {
    const url = decodeURIComponent(document.location.search);
    const match = url.match(/q=(.*?)(?:&|$|\/)/);
    if (match) {
        const query = match[1];
        const filters = decodeURIComponent(query).split(' ');
        filters.push('type:issue');
        //console.debug(`Search filters found in URL: ${filters}`);
        return filters.filter(filter => !filter.startsWith('is:')).join(" ");
    } else {
        console.debug('No search filters found in URL');
    }
    return 'state:open sort:created-desc type:issue';
}

function getPageNumber() {
    const url = decodeURI(document.location.search);
    const match = url.match(/page=(.*?)(?:&|$|\/)/);
    if (match) {
        const pageNumber = parseInt(match[1], 10);
        if (!isNaN(pageNumber)) {
            return pageNumber;
        }
    }
    return 1; // Default to page 1 if not found
}

function processIssues(issues) {
    const processedIssues = {};
    for (let i = 0; i < issues.length; i++) {
        const issue = issues[i];
        const openTaskCount = (issue.body.match(/^- \[ \]/gm) || []).length;
        const completedTaskCount = (issue.body.match(/^- \[x\]/gm) || []).length;
        const allTaskCount = openTaskCount + completedTaskCount;
        if (allTaskCount === 0) {
            console.debug(`No tasks found in issue #${issue.number}`);
            continue;
        }
        const progress = (completedTaskCount / allTaskCount) * 100;
        processedIssues[issue.number] = { allTaskCount, completedTaskCount, progress };
    }
    return processedIssues;
}

function createProgressCircleSVG(strokeDashoffset) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 20 20");
    svg.style.transform = "rotate(-90deg)";

    const backgroundCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    backgroundCircle.setAttribute("r", "8");
    backgroundCircle.setAttribute("cx", "10");
    backgroundCircle.setAttribute("cy", "10");
    backgroundCircle.setAttribute("fill", "transparent");
    backgroundCircle.setAttribute("stroke", "#444c56");
    backgroundCircle.setAttribute("stroke-width", "3px");

    const progressCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    progressCircle.setAttribute("r", "8");
    progressCircle.setAttribute("cx", "10");
    progressCircle.setAttribute("cy", "10");
    progressCircle.setAttribute("stroke", "#52ec53");
    progressCircle.setAttribute("stroke-width", "3px");
    progressCircle.setAttribute("stroke-linecap", "round");
    progressCircle.setAttribute("stroke-dashoffset", `${strokeDashoffset}px`);
    progressCircle.setAttribute("fill", "transparent");
    progressCircle.setAttribute("stroke-dasharray", "50.28px");

    svg.appendChild(backgroundCircle);
    svg.appendChild(progressCircle);

    return svg;
}

function processWebIssues(apiData) {
    chrome.storage.local.get('completedIcon').then((data) => {
        const completedIcon = data.completedIcon !== undefined ? data.completedIcon : true;
        const issueNodes = document.querySelectorAll("li[role='listitem']");
        issueNodes.forEach((issue) => {
            const title = issue.querySelector("[class*='Title-module__container']");
            if (!title) return;
            const issueNumber = issue.querySelector("span[class*='defaultNumberDescription']").textContent.trim().split('#')[1];
            const trailingBadgesContainer = title.querySelector("[class*='Title-module__trailingBadgesContainer']");

            if (!title || !issueNumber || !trailingBadgesContainer) return;

            const parsedNumber = parseInt(issueNumber, 10);
            const apiIssueData = apiData[parsedNumber];

            if (!apiIssueData) {
                console.debug(`No API data for: ${issueNumber}`);
                return;
            }

            const { allTaskCount, completedTaskCount, progress } = apiIssueData;
            const strokeDashoffset = ((100 - progress) / 100) * 50.28; // circumference -> radius 8
            const oldCounterDiv = document.getElementById(`tickback-counter-${parsedNumber}`);

            if (oldCounterDiv) {
                // Change values in existing counter
                const oldCounterText = document.getElementById(`tickback-counter-text-${parsedNumber}`);
                if (oldCounterText) {
                    oldCounterText.textContent = `${apiIssueData.completedTaskCount} / ${apiIssueData.allTaskCount}`;
                }
                const oldSvgDiv = document.getElementById(`tickback-svg-div-${parsedNumber}`);
                if (completedIcon && completedTaskCount === allTaskCount) {
                    oldSvgDiv.innerHTML = "";
                    const imgElement = document.createElement("img");
                    imgElement.className = "tickback-svg-img";
                    imgElement.src = chrome.runtime.getURL("icons/iconoir/check-circle.svg");
                    oldSvgDiv.appendChild(imgElement);
                } else if (oldSvgDiv) {
                    oldSvgDiv.innerHTML = "";
                    oldSvgDiv.appendChild(createProgressCircleSVG(strokeDashoffset));
                }
                //console.debug(`Updated ${issueNumber}: tasks: ${allTaskCount}, completed: ${completedTaskCount}, progress: ${progress.toFixed(2)}%`);
                return;
            }

            const counterDiv = document.createElement("div");
            counterDiv.id = `tickback-counter-${parsedNumber}`;
            counterDiv.className = "tickback-counter tickback-issues";

            const counterBorder = document.createElement("span");
            counterBorder.className = "tickback-counter-border tickback-issues";

            const counterText = document.createElement("span");
            counterText.textContent = `${completedTaskCount} / ${allTaskCount}`;
            counterText.id = `tickback-counter-text-${parsedNumber}`;
            counterText.className = "tickback-counter-text tickback-issues";

            const svgDiv = document.createElement("div");
            svgDiv.id = `tickback-svg-div-${parsedNumber}`;
            svgDiv.className = "tickback-svg-div tickback-issues";
            if (completedIcon && completedTaskCount === allTaskCount) {
                const imgElement = document.createElement("img");
                imgElement.className = "tickback-svg-img";
                imgElement.src = chrome.runtime.getURL("icons/iconoir/check-circle.svg");
                svgDiv.appendChild(imgElement);
            } else {
                svgDiv.appendChild(createProgressCircleSVG(strokeDashoffset));
            }

            counterBorder.appendChild(svgDiv);
            counterBorder.appendChild(counterText);
            counterDiv.appendChild(counterBorder);
            trailingBadgesContainer.prepend(counterDiv);

            //console.debug(`${issueNumber} - tasks: ${allTaskCount}, completed: ${completedTaskCount}, progress: ${progress.toFixed(2)}%`);
        });
    });
}

function processOneIssue(apiData, issueNumber) {
    chrome.storage.local.get(['completedIcon', 'incompleteIcon']).then((data) => {
        const completedIcon = data.completedIcon !== undefined ? data.completedIcon : true;
        const incompleteIcon = data.incompleteIcon !== undefined ? data.incompleteIcon : true;
        const issueMetadata = document.querySelector('div[data-testid="issue-metadata-fixed"]');
        const issueScrollMetadata = document.querySelector('div[data-testid="issue-metadata-sticky"]');
        const issueDivForBadge = issueMetadata.children[0].children[0];
        const issueScrollDivForBadge = issueScrollMetadata.children[0].children[0].children[1].children[1];

        if (!issueDivForBadge) {
            console.debug(`No issue metadata found for issue #${issueNumber}`);
            return;
        } else if (!issueScrollDivForBadge) {
            console.debug(`No issue scroll metadata found for issue #${issueNumber}`);
            return;
        }

        const { allTaskCount, completedTaskCount, progress } = apiData;
        const strokeDashoffset = ((100 - progress) / 100) * 50.28; // circumference -> radius 8
        const oldCounterDiv = issueDivForBadge.querySelector("#tickback-counter");
        const oldStickyCounterDiv = issueScrollDivForBadge.querySelector("#tickback-sticky-counter");

        // Helper to set SVG or icon for a given div
        function setProgressIcon(targetDiv, className) {
            targetDiv.innerHTML = "";
            if (completedIcon && completedTaskCount === allTaskCount) {
                const imgElement = document.createElement("img");
                imgElement.className = className;
                imgElement.src = chrome.runtime.getURL("icons/iconoir/check-circle.svg");
                targetDiv.appendChild(imgElement);
            } else if (incompleteIcon && completedTaskCount === 0) {
                const imgElement = document.createElement("img");
                imgElement.className = className;
                imgElement.src = chrome.runtime.getURL("icons/iconoir/task-list.svg");
                targetDiv.appendChild(imgElement);
            } else {
                targetDiv.appendChild(createProgressCircleSVG(strokeDashoffset));
            }
        }

        let updated = false;

        if (oldCounterDiv) {
            const counterText = oldCounterDiv.querySelector("#tickback-counter-text");

            if (counterText) {
                counterText.textContent = `${completedTaskCount} / ${allTaskCount}`;
            }

            const svgDiv = oldCounterDiv.querySelector("#tickback-svg-div");
            svgDiv.className = "tickback-svg-div tickback-one";
            setProgressIcon(svgDiv, "tickback-one-svg-img");

            updated = true;
        } else {
            // Assemble the main counter div ===

            const counterDiv = document.createElement("div");
            counterDiv.className = "tickback-counter tickback-one";
            counterDiv.id = "tickback-counter";

            const counterBorder = document.createElement("span");
            counterBorder.className = "tickback-counter-border tickback-one";
            counterBorder.id = "tickback-counter-border";

            const counterText = document.createElement("span");
            counterText.textContent = `${completedTaskCount} / ${allTaskCount}`;
            counterText.className = "tickback-counter-text tickback-one";
            counterText.id = "tickback-counter-text";

            const svgDiv = document.createElement("div");
            svgDiv.className = "tickback-svg-div tickback-one";
            svgDiv.id = "tickback-svg-div";
            setProgressIcon(svgDiv, "tickback-one-svg-img");

            counterBorder.appendChild(svgDiv);
            counterBorder.appendChild(counterText);
            counterDiv.appendChild(counterBorder);
            if (issueDivForBadge.children.length > 1) {
                issueDivForBadge.insertBefore(counterDiv, issueDivForBadge.children[1]);
            } else {
                issueDivForBadge.appendChild(counterDiv);
            }
        }

        if (oldStickyCounterDiv) {
            const stickyCounterText = oldStickyCounterDiv.querySelector("#tickback-sticky-counter-text");

            if (stickyCounterText) {
                stickyCounterText.textContent = `${completedTaskCount} / ${allTaskCount}`;
            }

            const stickySvgDiv = oldStickyCounterDiv.querySelector("#tickback-sticky-svg-div");
            stickySvgDiv.className = "tickback-svg-div tickback-sticky tickback-one";
            setProgressIcon(stickySvgDiv, "tickback-sticky-svg-img");

            updated = true;
        } else {
            // Assemble the sticky metadata counter ===

            const stickyCounterDiv = document.createElement("div");
            stickyCounterDiv.className = "tickback-counter tickback-sticky";
            stickyCounterDiv.id = "tickback-sticky-counter";
            
            const stickyCounterText = document.createElement("span");
            stickyCounterText.textContent = `${completedTaskCount} / ${allTaskCount}`;
            stickyCounterText.className = "tickback-counter-text tickback-sticky";
            stickyCounterText.id = "tickback-sticky-counter-text";
            
            const stickySvgDiv = document.createElement("div");
            stickySvgDiv.className = "tickback-svg-div tickback-sticky tickback-one";
            stickySvgDiv.id = "tickback-sticky-svg-div";
            setProgressIcon(stickySvgDiv, "tickback-sticky-svg-img");
            
            stickyCounterDiv.appendChild(stickySvgDiv);
            stickyCounterDiv.appendChild(stickyCounterText);
            if (issueScrollDivForBadge.children.length > 0) {
                issueScrollDivForBadge.insertBefore(stickyCounterDiv, issueScrollDivForBadge.children[0]);
            } else {
                issueScrollDivForBadge.appendChild(stickyCounterDiv);
            }
        }

        if (updated) {
            //console.debug(`Updated existing issue counter - tasks: ${allTaskCount}, completed: ${completedTaskCount}, progress: ${progress.toFixed(2)}%`);
            return;
        }

        observeIssueBodyChanges(issueNumber);
        //console.debug(`Single issue: tasks: ${allTaskCount}, completed: ${completedTaskCount}, progress: ${progress.toFixed(2)}%`);
    });
}

// Observe changes in the issue body to reload the issue when task list changes
function observeIssueBodyChanges(issueNumber) {
    const issueBody = document.querySelector('div[data-testid*="issue-body"]');
    const markdownBody = issueBody.querySelector('div[data-testid*="markdown-body"]');
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            const mutationTarget = markdownBody.children[0];
            if (mutation.type === 'childList' && mutation.target === mutationTarget) {
                //console.log(`Issue #${issueNumber} task list changed, reloading... (OBSERVER)`);
                loadSingleIssue(issueNumber);
            }
        });
    });
    observer.observe(markdownBody, {
        childList: true,
        subtree: true,
        characterData: true
    });
}

// Issues page fetch
function loadIssuesPage() {
    insertCSS('issues');
    chrome.storage.local.get('token').then((result) => {
        const token = result.token;
        if (token) {
            const { owner, repo } = getRepInfo();
            getApiIssues(token, owner, repo, getSearchFilters(), getPageNumber()).then((apiIssues) => {
                if (apiIssues && apiIssues.length > 0) {
                    //console.debug('Issues retrieved from API:', apiIssues.length);
                    processWebIssues(processIssues(apiIssues));
                } else {
                    console.debug('No issues found or empty response');
                }
            }).catch((error) => {
                console.error('Error fetching issues:', error);
            });
        }
    }).catch((error) => {
        console.error('Error retrieving token from storage:', error);
    });
}

// Single issue fetch
function loadSingleIssue(issueNumber) {
    insertCSS('issues');
    try {
        const processedData = getSingleIssueBody();
        if (!processedData) {
            console.debug(`No task list found in issue #${issueNumber} body`);
            return;
        }
        processOneIssue(processedData, issueNumber);
    } catch (error) {
        console.error(`Error processing issue #${issueNumber}:`, error);
    }
}

function insertCSS(name) {
    if (document.getElementById(`tickback-${name}-link`)) {
        //console.debug(`Link exists: ${name}`);
        return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL(`styles/${name}.css`);
    link.id = `tickback-${name}-link`;
    document.head.appendChild(link);
}

// match "/issues" and "/issues/"
const regexIssuesPage = /\/issues\/?$/;
if (regexIssuesPage.test(document.location.pathname)) {
    loadIssuesPage();
}

// match "/issue/12" and "/issue/12/"
const regexIssuePage = /\/issues\/(\d+)\/?$/;
if (regexIssuePage.test(document.location.pathname)) {
    const issueNumber = regexIssuePage.exec(document.location.pathname)[1];
    loadSingleIssue(issueNumber);
}

// Check for GitHub progress bar removal

const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        //console.log('HTML changed', mutation, mutation.target.nodeName);
        if (mutation.target.nodeName === 'HTML' && mutation.type === 'childList') {
            // div.turbo-progress-bar
            if (mutation.removedNodes[0]?.classList.contains('turbo-progress-bar')) {
                //console.log('Turbo progress bar removed');
                if (regexIssuesPage.test(document.location.pathname)) {
                    setTimeout(() => {
                        loadIssuesPage();
                    }, 1000);
                } else if (regexIssuePage.test(document.location.pathname)) {
                    const issueNumber = regexIssuePage.exec(document.location.pathname)[1];
                    setTimeout(() => {
                        loadSingleIssue(issueNumber);
                    }, 1000);
                }
            }
        } else if (mutation.type === 'childList' && mutation.addedNodes[0]?.id === 'issue-body-viewer') {
            if (regexIssuePage.test(document.location.pathname)) {
                const issueNumber = regexIssuePage.exec(document.location.pathname)[1];
                setTimeout(() => {
                    loadSingleIssue(issueNumber);
                    observeIssueBodyChanges(issueNumber);
                }, 1000);
            }
        }
    });
});

observer.observe(document, {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true
});

// Add event listener for going back in history
window.addEventListener('popstate', () => {
    //console.log('History changed');
    if (document.location.pathname.endsWith('/issues') || document.location.pathname.endsWith('/issues/')) {
        setTimeout(() => {
            loadIssuesPage();
        }, 2000);
    } else if (regexIssuePage.test(document.location.pathname)) {
        const issueNumber = regexIssuePage.exec(document.location.pathname)[1];
        setTimeout(() => {
            loadSingleIssue(issueNumber);
        }, 1000);
    }
});