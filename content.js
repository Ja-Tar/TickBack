// Main script

async function getDataFromAPI(token, owner = 'Ja-Tar', repo = 'TickBack') {
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
                            issues(first: 25, orderBy: {field: CREATED_AT, direction: DESC}) {
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
    const url = decodeURI(document.location.href);
    const match = url.match(/github\.com\/[^/]+\/[^/]+\/issues\?q=(.*)/);
    if (match) {
        const query = match[1];
        const filters = decodeURIComponent(query).split('+').map(filter => filter.trim());
        console.log('Search Filters:', filters);
        return filters;
    } else {
        console.log('No search filters found in URL, default filters will be used');
        // Default filters -> is:issue state:open
        return ['is:issue', 'state:open'];
    }
}

async function fetchIssues() {
    browser.storage.local.get('token').then((result) => {
        const token = result.token;
        if (token) {
            const filters = getSearchFilters();
            const { owner, repo } = getRepInfo();
            getDataFromAPI(token, owner, repo).then((issues) => {
                if (issues && issues.length > 0) {
                    console.log('Issues retrieved from API:', issues.length);
                    processIssues(issues);
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

function processIssues(issues) {
    issues.forEach(issue => {
        const openTaskCount = (issue.body.match(/- \[ \]/g) || []).length;
        const completedTaskCount = (issue.body.match(/- \[x\]/g) || []).length;
        const allTaskCount = openTaskCount + completedTaskCount;
        if (allTaskCount === 0) {
            console.log(`Issue: ${issue.number} - No tasks found`);
            return;
        }
        const progress = (completedTaskCount / allTaskCount) * 100;
        console.log(`Issue: ${issue.number} - tasks: ${allTaskCount}, completed: ${completedTaskCount}, progress: ${progress.toFixed(2)}%`);
        return { issueNumber: issue.number, allTaskCount, completedTaskCount, progress};
    });
}

fetchIssues();