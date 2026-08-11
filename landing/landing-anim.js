(function () {
  "use strict";

  var DEMO_URL = "paypal-checkout.html";

  var burger = document.getElementById("burger");
  var menu = document.getElementById("mobileMenu");

  burger.addEventListener("click", function () {
    var open = burger.classList.toggle("open");
    menu.classList.toggle("open", open);
    menu.classList.toggle("closed", !open);
  });

  document.querySelectorAll("#mobileMenu a").forEach(function (a) {
    a.addEventListener("click", function () {
      burger.classList.remove("open");
      menu.classList.remove("open");
      menu.classList.add("closed");
    });
  });

  document.querySelectorAll("[data-go]").forEach(function (b) {
    b.addEventListener("click", function () {
      window.open(DEMO_URL, "_blank");
    });
  });

  document.querySelectorAll("[data-learn]").forEach(function (b) {
    b.addEventListener("click", function () {
      window.open(DEMO_URL, "_blank");
    });
  });
})();