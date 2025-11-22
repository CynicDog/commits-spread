import requests
import json
import os
from collections import defaultdict

# Read environment variables. GITHUB_TOKEN and GITHUB_USERNAME are essential.
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
GITHUB_USERNAME = os.getenv('GITHUB_USERNAME')

# Base headers for most API calls.
HEADERS = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': f'Bearer {GITHUB_TOKEN}',
    'X-GitHub-Api-Version': '2022-11-28'
}


def get_repos():
    """Fetches all repositories belonging to the authenticated user.

    Returns:
        list[dict]: A list of repository dictionaries from the GitHub API.
    """
    print("Fetching list of repositories...")
    url = 'https://api.github.com/user/repos'
    
    # Pagination is not implemented here, assuming fewer than 100 repositories.
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    return response.json()


def get_topics(owner: str, repo: str) -> list[str]:
    """Fetches topics for a specific repository.

    Args:
        owner: The owner (user or organization) of the repository.
        repo: The name of the repository.

    Returns:
        list[str]: A list of topics (strings) for the repository.
    """
    url = f'https://api.github.com/repos/{owner}/{repo}/topics'
    # Topics API requires a specific media type header.
    headers = HEADERS.copy()
    headers['Accept'] = 'application/vnd.github.mercy-preview+json'
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json().get('names', [])
    except requests.exceptions.HTTPError as e:
        # Handle 404 (Not Found) if repo has no topics set or if topics are disabled.
        if e.response.status_code == 404:
            return []
        raise


def commit_author(commit: dict) -> str | None:
    """Safely extracts the author's login from a commit object.

    Args:
        commit: A dictionary representing a single commit object from the API.

    Returns:
        str | None: The GitHub login of the author, or None if not available.
    """
    author = commit.get('author')
    if author:
        return author.get('login')
    return None


def get_commits(owner: str, repo: str) -> list[dict]:
    """Fetches ALL commits for a repository, handles pagination, and filters by GITHUB_USERNAME.

    Args:
        owner: The owner (user or organization) of the repository.
        repo: The name of the repository.

    Returns:
        list[dict]: A list of commit dictionaries authored by GITHUB_USERNAME.
    """
    all_commits = []
    # Set per_page=100 for maximum efficiency, making fewer API calls.
    initial_url = f'https://api.github.com/repos/{owner}/{repo}/commits?per_page=100'
    url = initial_url
    
    while url:
        try:
            response = requests.get(url, headers=HEADERS)
            response.raise_for_status()
            
            commits = response.json()
            
            # Filter commits from the current page by your username.
            filtered_commits = [
                commit for commit in commits 
                if commit_author(commit) == GITHUB_USERNAME
            ]
            all_commits.extend(filtered_commits)
            
            # Check for the 'Link' header to find the URL for the next page.
            link_header = response.headers.get('Link')
            url = None  # Reset url for the next loop iteration.
            
            if link_header:
                # Parse the Link header to find the 'next' URL.
                # Example: <https://api...>; rel="next", <https://api...>; rel="last"
                links = link_header.split(', ')
                for link in links:
                    if 'rel="next"' in link:
                        # Extract the URL from inside the angle brackets.
                        url = link.split(';')[0].strip('<>')
                        break
                        
        except requests.exceptions.RequestException as e:
            print(f"Error fetching commits for {owner}/{repo}: {e}")
            break  # Exit loop on error.
            
    return all_commits


def save_commit_history(data: list[dict], filename: str = 'commit_history.json'):
    """Saves the processed commit data, overwriting the existing file.

    Args:
        data: The list of daily commit summary dictionaries to save.
        filename: The path to the output JSON file.
    """
    print(f"\nSaving {len(data)} daily summary entries to {filename} (Overwriting existing file)...")
    with open(filename, 'w') as f:
        json.dump(data, f, indent=4)
    print("Save complete.")


def main():
    """Main function to fetch, process, and save GitHub commit history by topic."""
    if not GITHUB_TOKEN or not GITHUB_USERNAME:
        print("ERROR: Please set GITHUB_TOKEN and GITHUB_USERNAME environment variables.")
        return

    repos = get_repos()
    
    # commits_by_date: Tracks commits SHA ({date: {topic: {sha1, sha2, ...}}})
    commits_by_date = defaultdict(lambda: defaultdict(set))
    # commits_per_date: Tracks all unique commit SHAs per day ({date: {sha1, sha2, ...}})
    commits_per_date = defaultdict(set) 

    print(f"Processing {len(repos)} repositories...")

    for repo in repos:
        owner = repo['owner']['login']
        repo_name = repo['name']
        
        print(f"  -> Processing {owner}/{repo_name}...")
        
        try:
            topics = get_topics(owner, repo_name)
            commits = get_commits(owner, repo_name)
        except requests.exceptions.RequestException as e:
            print(f"Skipping repo {repo_name} due to an API error: {e}")
            continue

        for commit in commits:
            sha = commit['sha']
            # Extract only the date part (e.g., '2023-10-27').
            date = commit['commit']['author']['date'].split('T')[0] 
            
            # 1. Track all unique commits made by the user on this date.
            commits_per_date[date].add(sha)
            
            # 2. Track commits associated with each topic.
            for topic in topics:
                commits_by_date[date][topic].add(sha)

    # Convert the collected sets of SHAs into counts.
    results = []
    # Sort results by date for chronological output.
    for date, topics_shas in sorted(commits_by_date.items()):
        # Calculate the count for each topic.
        topics_count = {topic: len(shas) for topic, shas in topics_shas.items()}
        
        result = {
            'date': date,
            'commits_by_topics': topics_count,
            'total_count': len(commits_per_date[date])  # Total unique commits on this date.
        }
        results.append(result)

    save_commit_history(results)


if __name__ == '__main__':
    main()
