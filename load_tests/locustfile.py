from locust import HttpUser, task, between

class QuickSmokeUser(HttpUser):
    wait_time = between(1, 3)

    @task(5)
    def health(self):
        self.client.get("/health")

    @task(2)
    def docs(self):
        self.client.get("/api/docs")

    @task(1)
    def openapi(self):
        self.client.get("/api/openapi.json")
