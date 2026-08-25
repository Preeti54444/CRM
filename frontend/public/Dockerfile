# Previously: python:3.11-slim running `python -m http.server 80`.
# That built-in server is single-threaded and handles one request at a
# time - fine for quick local testing, but a real bottleneck once more
# than one employee is using the CRM at the same time. nginx serves
# static files concurrently and efficiently, which is what this
# container is only ever used for (plain HTML/CSS/JS files).
FROM nginx:1.25-alpine

COPY . /usr/share/nginx/html

EXPOSE 80
