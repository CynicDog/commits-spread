import requests
import json
import os
from collections import defaultdict

# Read environment variables directly
GITHUB_TOKEN = os.getenv('GITHUB_TOKEN')
GITHUB_USERNAME = os.getenv('GITHUB_USERNAME')
REPO_NAME = os.getenv('REPO_NAME')

HEADERS = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': f'Bearer {GITHUB_TOKEN}',
    'X-GitHub-Api-Version': '2022-11-28'
}

def get_repos():
    url = 'https://api.github.com/user/repos'
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    return response.json()

def get_topics(owner, repo):
    url = f'https://api.github.com/repos/{owner}/{repo}/topics'
    headers = HEADERS.copy()
    headers['Accept'] = 'application/vnd.github.mercy-preview+json'
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json().get('names', [])

def get_commits(owner, repo):
    url = f'https://api.github.com/repos/{owner}/{repo}/commits'
    response = requests.get(url, headers=HEADERS)
    response.raise_for_status()
    
    commits = response.json()
    filtered_commits = [
        commit for commit in commits 
        if commit_author(commit) == GITHUB_USERNAME  # Filter commits by your username
    ]
    return filtered_commits

def commit_author(commit):
    author = commit.get('author')
    if author:
        return author.get('login')
    return None

def save_commit_history(new_data, filename='commit_history.json'):
    # Read existing data
    if os.path.exists(filename):
        with open(filename, 'r') as f:
            existing_data = json.load(f)
    else:
        existing_data = []

    # Create a set of existing dates for quick lookup
    existing_dates = {entry['date'] for entry in existing_data}

    # Append new data only if the date is not already present
    for new_entry in new_data:
        if new_entry['date'] not in existing_dates:
            existing_data.append(new_entry)

    # Write the combined data back to the file
    with open(filename, 'w') as f:
        json.dump(existing_data, f, indent=4)

def main():
    repos = get_repos()
    commits_by_date = defaultdict(lambda: defaultdict(set))
    commits_per_date = defaultdict(set)

    for repo in repos:
        owner = repo['owner']['login']
        repo_name = repo['name']
        topics = get_topics(owner, repo_name)
        
        commits = get_commits(owner, repo_name)
        for commit in commits:
            sha = commit['sha']
            date = commit['commit']['author']['date'].split('T')[0]  # Extract the date part
            commits_per_date[date].add(sha)
            for topic in topics:
                commits_by_date[date][topic].add(sha)

    results = []
    for date, topics_shas in sorted(commits_by_date.items()):
        topics_count = {topic: len(shas) for topic, shas in topics_shas.items()}
        result = {
            'date': date,
            'commits_by_topics': topics_count,
            'total_count': len(commits_per_date[date])  # Count unique commits per date
        }
        results.append(result)

    save_commit_history(results)

if __name__ == '__main__':
    main()
