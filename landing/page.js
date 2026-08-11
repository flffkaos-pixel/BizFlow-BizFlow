(function () {
  "use strict";

  var burger = document.getElementById("burger");
  var menu = document.getElementById("mobileMenu");

  if (burger && menu) {
    burger.addEventListener("click", function () {
      var open = burger.classList.toggle("open");
      menu.classList.toggle("open", open);
      menu.classList.toggle("closed", !open);
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        burger.classList.remove("open");
        menu.classList.remove("open");
        menu.classList.add("closed");
      });
    });
  }
})();