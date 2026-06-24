const main = async (app) => {
  const accountsTabSample = document.getElementById("accounts-tab-sample");
  const h1 = accountsTabSample.querySelector("h1");
  const context = await app.context();
  h1.textContent = `Hello World ${context.user.fullName}, Welcome to the Accounts Tab of ${context.company.companyName}`;
};

window.rocketlaneApp.init().then((app) => {
  main(app);
});
