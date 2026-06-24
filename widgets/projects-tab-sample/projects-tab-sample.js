const main = async (app) => {
  const projectsTabSample = document.getElementById("projects-tab-sample");
  const h1 = projectsTabSample.querySelector("h1");
  const context = await app.context();
  h1.textContent = `Hello World ${context.user.fullName}, Welcome to the Projects Tab of ${context.project.projectName}`;
};

window.rocketlaneApp.init().then((app) => {
  main(app);
});
