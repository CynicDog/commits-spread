FROM python:3.9

# Copy the script
COPY scripts /scripts

# Install dependencies
RUN pip install requests

# Set the entrypoint
ENTRYPOINT ["python", "/scripts/update_commit_history.py"]
