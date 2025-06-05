// Main script

async function getApiIssues(
    token,
    owner = 'Ja-Tar',
    repo = 'TickBack',
    query = 'state:open sort:created-desc type:issue'
) {
    const rateLimitInfo = await browser.storage.local.get(['wrongToken', 'rateLimitRemaining', 'rateLimitReset'])
    let wrongToken = rateLimitInfo.wrongToken;
    let rateLimitRemaining = rateLimitInfo.rateLimitRemaining;
    let rateLimitReset = rateLimitInfo.rateLimitReset;

    // Stop if rate limit is reached or wrong token
    if (wrongToken === true) {
        console.warn('Rate limit is too low, change token');
        return [];
    } else if (rateLimitRemaining <= 5) {
        const resetTime = new Date(rateLimitReset * 1000);
        if (resetTime <= new Date()) {
            console.warn('Rate limit reached, but reset time has passed. Fetching data...');
        } else {
            console.warn('Rate limit reached, waiting for reset time...');
            return [];
        }
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
                        search(first: 25, type: ISSUE, query: "repo:${owner}/${repo} ${query}") {
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
        wrongToken = true;
    }
    rateLimitRemaining = parseInt(response.headers.get('X-RateLimit-Remaining'), 10);
    rateLimitReset = parseInt(response.headers.get('X-RateLimit-Reset'), 10);

    browser.storage.local.set({
        wrongToken,
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
            console.warn(`Issue #${issue.number} has no body, skipping...`);
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
        console.warn('No tasks found in issue body');
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
    const url = decodeURI(document.location.href);
    const match = url.match(/github\.com\/[^/]+\/[^/]+\/issues\?q=(.*)/);
    if (match) {
        const query = match[1];
        const filters = decodeURIComponent(query).split(' ');
        filters.push('type:issue');
        console.debug(`Search filters found in URL: ${filters}`);
        return filters.filter(filter => !filter.startsWith('is:')).join(" ");
    } else {
        console.warn('No search filters found in URL');
    }
    return 'state:open sort:created-desc type:issue';
}

function processIssues(issues) {
    const processedIssues = {};
    for (let i = 0; i < issues.length; i++) {
        const issue = issues[i];
        const openTaskCount = (issue.body.match(/^- \[ \]/gm) || []).length;
        const completedTaskCount = (issue.body.match(/^- \[x\]/gm) || []).length;
        const allTaskCount = openTaskCount + completedTaskCount;
        if (allTaskCount === 0) {
            console.warn(`No tasks found in issue #${issue.number}`);
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
    browser.storage.local.get('completedIcon').then((data) => {
        const completedIcon = data.completedIcon !== undefined ? data.completedIcon : true;
        const issueNodes = document.querySelectorAll("li[role='listitem']");
        issueNodes.forEach((issue) => {
            const title = issue.querySelector("[class*='Title-module__container']");
            const issueNumber = issue.querySelector("span[class*='defaultNumberDescription']").textContent.trim().split('#')[1];
            const trailingBadgesContainer = title.querySelector("[class*='Title-module__trailingBadgesContainer']");

            if (!title || !issueNumber || !trailingBadgesContainer) return;

            const apiIssueData = apiData[parseInt(issueNumber, 10)];

            if (!apiIssueData) {
                console.warn(`No API data for: ${issueNumber}`);
                return;
            }

            const { allTaskCount, completedTaskCount, progress } = apiIssueData;
            const strokeDashoffset = ((100 - progress) / 100) * 50.28; // circumference -> radius 8
            const oldCounterDiv = document.getElementById(`tickback-counter-${issueNumber}`);

            if (oldCounterDiv) {
                // Change values in existing counter
                const oldCounterText = document.getElementById(`tickback-counter-text-${issueNumber}`);
                if (oldCounterText) {
                    oldCounterText.textContent = `${apiIssueData.completedTaskCount} / ${apiIssueData.allTaskCount}`;
                }
                const oldSvgDiv = document.getElementById(`tickback-svg-div-${issueNumber}`);
                if (completedIcon && completedTaskCount === allTaskCount) {
                    oldSvgDiv.innerHTML = "";
                    const imgElement = document.createElement("img");
                    imgElement.style.height = "inherit";
                    imgElement.src = browser.runtime.getURL("icons/iconoir/check-circle.svg");
                    oldSvgDiv.appendChild(imgElement);
                } else if (oldSvgDiv) {
                    oldSvgDiv.innerHTML = "";
                    oldSvgDiv.appendChild(createProgressCircleSVG(strokeDashoffset));
                }
                console.debug(`Updated ${issueNumber}: tasks: ${allTaskCount}, completed: ${completedTaskCount}, progress: ${progress.toFixed(2)}%`);
                return;
            }

            const counterDiv = document.createElement("div");
            counterDiv.style.display = "inline-flex";
            counterDiv.style.marginRight = "var(--base-size-4)";
            counterDiv.style.maxWidth = "100%";
            counterDiv.style.verticalAlign = "text-top";
            counterDiv.style.height = "20px";
            counterDiv.style.marginTop = "1px";
            counterDiv.id = `tickback-counter-${issueNumber}`;

            const counterBorder = document.createElement("span");
            counterBorder.style.borderWidth = "1px";
            counterBorder.style.borderColor = "var(--borderColor-muted,var(--color-border-muted))";
            counterBorder.style.borderStyle = "solid";
            counterBorder.style.maxWidth = "100%";
            counterBorder.style.borderRadius = "var(--borderRadius-full,624.9375rem)";
            counterBorder.style.fontSize = "var(--text-body-size-small,.75rem)";
            counterBorder.style.display = "inline-flex";
            counterBorder.style.alignItems = "center";

            const counterText = document.createElement("span");
            counterText.textContent = `${completedTaskCount} / ${allTaskCount}`;
            counterText.style.marginRight = "6px";
            counterText.style.fontSize = "0.75rem";
            counterText.style.lineHeight = "20px";
            counterText.style.fontWeight = "var(--base-text-weight-semibold,600)";
            counterText.style.lineHeight = "1";
            counterText.style.marginBottom = "1px";
            counterText.id = `tickback-counter-text-${issueNumber}`;

            const svgDiv = document.createElement("div");
            svgDiv.style.display = "inline-block";
            svgDiv.style.width = "13px";
            svgDiv.style.height = "13px";
            svgDiv.style.marginRight = "5px";
            svgDiv.style.marginLeft = "3px";
            svgDiv.style.lineHeight = "1";
            svgDiv.id = `tickback-svg-div-${issueNumber}`;
            if (completedIcon && completedTaskCount === allTaskCount) {
                const imgElement = document.createElement("img");
                imgElement.style.height = "inherit";
                imgElement.src = browser.runtime.getURL("icons/iconoir/check-circle.svg");
                svgDiv.appendChild(imgElement);
            } else {
                svgDiv.appendChild(createProgressCircleSVG(strokeDashoffset));
            }

            counterBorder.appendChild(svgDiv);
            counterBorder.appendChild(counterText);
            counterDiv.appendChild(counterBorder);
            trailingBadgesContainer.prepend(counterDiv);

            console.debug(`${issueNumber} - tasks: ${allTaskCount}, completed: ${completedTaskCount}, progress: ${progress.toFixed(2)}%`);
        });
    });
}

function processOneIssue(apiData, issueNumber) {
    browser.storage.local.get(['completedIcon', 'incompleteIcon']).then((data) => {
        const completedIcon = data.completedIcon !== undefined ? data.completedIcon : true;
        const incompleteIcon = data.incompleteIcon !== undefined ? data.incompleteIcon : true;
        const issueMetadata = document.querySelector('div[data-testid="issue-metadata-fixed"]');
        const issueDivForBadge = issueMetadata.children[0].children[0];

        if (!issueDivForBadge) {
            console.warn(`No issue metadata found for issue #${issueNumber}`);
            return;
        }

        const { allTaskCount, completedTaskCount, progress } = apiData;
        const strokeDashoffset = ((100 - progress) / 100) * 50.28; // circumference -> radius 8
        const oldCounterDiv = issueDivForBadge.querySelector("#tickback-counter");

        if (oldCounterDiv) {
            // Change values in existing counter
            const counterText = oldCounterDiv.querySelector("#tickback-counter-text");
            if (counterText) {
                counterText.textContent = `${completedTaskCount} / ${allTaskCount}`;
            }
            const svgDiv = oldCounterDiv.querySelector("#tickback-svg-div");
            if (completedIcon && completedTaskCount === allTaskCount) {
                svgDiv.innerHTML = "";
                const imgElement = document.createElement("img");
                imgElement.style.height = "20px";
                imgElement.src = browser.runtime.getURL("icons/iconoir/check-circle.svg");
                svgDiv.appendChild(imgElement);
            } else if (incompleteIcon && completedTaskCount === 0) {
                svgDiv.innerHTML = "";
                const imgElement = document.createElement("img");
                imgElement.style.height = "20px";
                imgElement.src = browser.runtime.getURL("icons/iconoir/task-list.svg");
                svgDiv.appendChild(imgElement);
            } else if (svgDiv) {
                svgDiv.innerHTML = "";
                svgDiv.appendChild(createProgressCircleSVG(strokeDashoffset));
            }
            console.debug(`Updated existing issue counter: tasks: ${allTaskCount}, completed: ${completedTaskCount}, progress: ${progress.toFixed(2)}%`);
            return;
        }

        const counterDiv = document.createElement("div");
        counterDiv.style.display = "inline-flex";
        counterDiv.style.marginRight = "var(--base-size-4)";
        counterDiv.style.height = "100%";
        counterDiv.id = "tickback-counter";

        const counterBorder = document.createElement("span");
        counterBorder.style.borderWidth = "1px";
        counterBorder.style.borderColor = "var(--borderColor-muted,var(--color-border-muted))";
        counterBorder.style.borderStyle = "solid";
        counterBorder.style.borderRadius = "var(--borderRadius-full,624.9375rem)";
        counterBorder.style.fontSize = "var(--text-body-size-small,.75rem)";
        counterBorder.style.alignContent = "center";
        counterBorder.id = "tickback-counter-border";

        const counterText = document.createElement("span");
        counterText.textContent = `${completedTaskCount} / ${allTaskCount}`;
        counterText.style.marginRight = "8px";
        counterText.style.fontSize = "1.5em";
        counterText.style.fontWeight = "var(--base-text-weight-semibold,600)";
        counterText.style.verticalAlign = "super";
        counterText.id = "tickback-counter-text";

        const svgDiv = document.createElement("div");
        svgDiv.style.display = "inline-flex";
        svgDiv.style.width = "20px";
        svgDiv.style.height = "auto";
        svgDiv.style.verticalAlign = "baseline";
        svgDiv.style.margin = "0 5px";
        svgDiv.id = "tickback-svg-div";
        if (completedIcon && completedTaskCount === allTaskCount) {
            const imgElement = document.createElement("img");
            imgElement.style.height = "20px";
            imgElement.src = browser.runtime.getURL("icons/iconoir/check-circle.svg");
            svgDiv.appendChild(imgElement);
        } else if (incompleteIcon && completedTaskCount === 0) {
            const imgElement = document.createElement("img");
            imgElement.style.height = "20px";
            imgElement.src = browser.runtime.getURL("icons/iconoir/task-list.svg");
            svgDiv.appendChild(imgElement);
        } else if (svgDiv) {
            svgDiv.innerHTML = "";
            svgDiv.appendChild(createProgressCircleSVG(strokeDashoffset));
        }

        counterBorder.appendChild(svgDiv);
        counterBorder.appendChild(counterText);
        counterDiv.appendChild(counterBorder);
        issueDivForBadge.appendChild(counterDiv);

        observeIssueBodyChanges(issueNumber);

        console.debug(`Single issue: tasks: ${allTaskCount}, completed: ${completedTaskCount}, progress: ${progress.toFixed(2)}%`);
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
    browser.storage.local.get('token').then((result) => {
        const token = result.token;
        if (token) {
            const { owner, repo } = getRepInfo();
            getApiIssues(token, owner, repo, getSearchFilters()).then((apiIssues) => {
                if (apiIssues && apiIssues.length > 0) {
                    console.debug('Issues retrieved from API:', apiIssues.length);
                    processWebIssues(processIssues(apiIssues));
                } else {
                    console.warn('No issues found or empty response');
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
    try {
        const processedData = getSingleIssueBody();
        if (!processedData) {
            console.warn(`No task list found in issue #${issueNumber} body`);
            return;
        }
        processOneIssue(processedData, issueNumber);
    } catch (error) {
        console.error(`Error processing issue #${issueNumber}:`, error);
    }
}

if (document.location.pathname.endsWith('/issues') || document.location.pathname.endsWith('/issues/')) {
    setTimeout(() => {
        loadIssuesPage();
    }, 1000);
}

// match "/issue/12" and "/issue/12/"
const regexIssuePage = /\/issues\/(\d+)\/?$/;
if (regexIssuePage.test(document.location.pathname)) {
    const issueNumber = regexIssuePage.exec(document.location.pathname)[1];
    //console.log(`Issue number found: ${issueNumber}`);

    setTimeout(() => {
        loadSingleIssue(issueNumber);
    }, 1000);
}

// Check for GitHub progress bar removal

const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        //console.log('HTML changed', mutation, mutation.target.nodeName);
        if (mutation.target.nodeName === 'HTML' && mutation.type === 'childList') {
            // div.turbo-progress-bar
            if (mutation.removedNodes[0]?.classList.contains('turbo-progress-bar')) {
                //console.log('Turbo progress bar removed');
                if (document.location.pathname.endsWith('/issues') || document.location.pathname.endsWith('/issues/')) {
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