import { useEffect } from "react";

function App() {
  useEffect(() => {
    window.location.replace("/login.html");
  }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", fontFamily: "system-ui" }}>
      <p>Loading Funding Sathi CRM… <a href="/login.html">Click here if not redirected</a></p>
    </div>
  );
}

export default App;
