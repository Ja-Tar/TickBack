// Main script

async function getDataFromAPI(
    token,
    owner = 'Ja-Tar',
    repo = 'TickBack',
    filterBy = ['states: OPEN'],
    orderBy = ['CREATED_AT', 'DESC']
) {
    try {
        const response = await fetch('https://api.github.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                query: `
                    query repository {
                        repository(owner: "${owner}", name: "${repo}") {
                            issues(
                                first: 25
                                orderBy: {field: ${orderBy[0]}, direction: ${orderBy[1]}}
                                filterBy: {${filterBy.join(', ')}}
                            ) {
                                nodes {
                                    body
                                    number
                                }
                                totalCount
                            }
                        }
                    }
                `
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        return data.data.repository.issues.nodes.map(issue => ({
            body: issue.body,
            number: issue.number
        }));
    } catch (error) {
        console.error('Error:', error);
    }
}

function getRepInfo() {
    const url = document.location.href;
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) {
        const owner = match[1];
        const repo = match[2];
        console.log(`Repository Owner: ${owner}, Repository Name: ${repo}`);
        return { owner, repo };
    } else {
        console.error('Could not extract repository information from URL');
        return null;
    }
}

function getSearchFilters() {
    const searchFiltersToAPI = {
        'state:open': 'states: OPEN',
        'state:closed': 'states: CLOSED'
    };

    const url = decodeURI(document.location.href);
    const match = url.match(/github\.com\/[^/]+\/[^/]+\/issues\?q=(.*)/);
    if (match) {
        const query = match[1];
        const filters = decodeURIComponent(query).split(' ').map(filter => filter.trim());
        let apiFilters = [];
        for (let i = 0; i < filters.length; i++) {
            const normalizedFilter = filters[i].toLowerCase();
            if (normalizedFilter.startsWith('is:')) {
                continue;
            } else if (!searchFiltersToAPI[normalizedFilter]) {
                console.warn(`Unknown filter: ${filters[i]}`);
                continue;
            }
            apiFilters.push(searchFiltersToAPI[normalizedFilter]);
        }
        console.log(`Filters: {${filters}}, API Filters: {${apiFilters}}`);
        return apiFilters;
    } else {
        console.warn('No search filters found in URL');
        return;
    }
}

function processIssues(issues) {
    let processedIssues = {};
    for (let i = 0; i < issues.length; i++) {
        const issue = issues[i];
        const openTaskCount = (issue.body.match(/- \[ \]/g) || []).length;
        const completedTaskCount = (issue.body.match(/- \[x\]/g) || []).length;
        const allTaskCount = openTaskCount + completedTaskCount;
        if (allTaskCount === 0) {
            console.log(`Issue: ${issue.number} - No tasks found`);
            continue;
        }
        const progress = (completedTaskCount / allTaskCount) * 100;
        console.log(`Issue: ${issue.number} - tasks: ${allTaskCount}, completed: ${completedTaskCount}, progress: ${progress.toFixed(2)}%`);
        processedIssues[issue.number] = { allTaskCount, completedTaskCount, progress };
    }
    return processedIssues;
}

function processWebIssues(apiData) {
    const issues = document.querySelectorAll("li[role='listitem']");
    issues.forEach((issue) => {
        const title = issue.querySelector("[class*='Title-module__container']");
        const issueNumber = issue.querySelector("span[class*='issue-item-module__defaultNumberDescription']").textContent.trim().split('#')[1];
        const trailingBadgesContainer = title.querySelector("[class*='Title-module__trailingBadgesContainer']");

        if (!title || !issueNumber || !trailingBadgesContainer) return;

        const apiIssueData = apiData[parseInt(issueNumber, 10)];

        if (!apiIssueData) {
            console.warn(`No API data found for issue number: ${issueNumber}`);
            return;
        }

        const { allTaskCount, completedTaskCount, progress } = apiIssueData;

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
        counterText.innerHTML = `${completedTaskCount} / ${allTaskCount}`;
        counterText.style.margin = "0 8px";
        counterText.style.fontSize = "var(--text-body-size-small,.75rem)";
        counterText.style.lineHeight = "20px";
        counterText.style.fontWeight = "var(--base-text-weight-semibold,600)";


        counterBorder.appendChild(counterText);
        counterDiv.appendChild(counterBorder);
        trailingBadgesContainer.prepend(counterDiv);

        console.log(`Issue: ${issueNumber} - tasks: ${allTaskCount}, completed: ${completedTaskCount}, progress: ${progress.toFixed(2)}%`);
    });
}

async function fetchIssues() {
    browser.storage.local.get('token').then((result) => {
        const token = result.token;
        if (token) {
            const filters = getSearchFilters();
            const { owner, repo } = getRepInfo();
            getDataFromAPI(token, owner, repo, filters).then((issues) => {
                if (issues && issues.length > 0) {
                    console.log('Issues retrieved from API:', issues.length);
                    processWebIssues(processIssues(issues));
                } else {
                    console.log('No issues found or empty response');
                }
            }).catch((error) => {
                console.error('Error fetching issues:', error);
            });
        }
    }).catch((error) => {
        console.error('Error retrieving token from storage:', error);
    });
}

fetchIssues();