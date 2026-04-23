/**
* Email Form Validation
*/
(function () {
  "use strict";

  let forms = document.querySelectorAll('.email-form');

  forms.forEach( function(e) {
    e.addEventListener('submit', function(event) {
      event.preventDefault();

      let thisForm = this;

      let action = thisForm.getAttribute('action');
      let recaptcha = thisForm.getAttribute('data-recaptcha-site-key');
      
      if( ! action ) {
        displayError(thisForm, 'The form action property is not set!');
        return;
      }
      thisForm.querySelector('.loading').classList.add('d-block');
      thisForm.querySelector('.error-message').classList.remove('d-block');
      thisForm.querySelector('.sent-message').classList.remove('d-block');

      let formData = new FormData( thisForm );

      if ( recaptcha ) {
        if(typeof grecaptcha !== "undefined" ) {
          grecaptcha.ready(function() {
            try {
              grecaptcha.execute(recaptcha, {action: 'submitEmailForm'})
              .then(token => {
                formData.set('recaptcha-response', token);
                submitEmailForm(thisForm, action, formData);
              })
            } catch(error) {
              displayError(thisForm, error);
            }
          });
        } else {
          displayError(thisForm, 'The reCaptcha javascript API url is not loaded!')
        }
      } else {
        submitEmailForm(thisForm, action, formData);
      }
    });
  });

  function submitEmailForm(thisForm, action, formData) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    fetch(action, {
      method: 'POST',
      body: formData,
      headers: {'X-Requested-With': 'XMLHttpRequest'},
      signal: controller.signal
    })
    .then(response => {
      if( response.ok ) {
        return response.text();
      } else {
        return response.text().then(text => { throw new Error(text || `${response.status} ${response.statusText}`); });
      }
    })
    .then(data => {
      thisForm.querySelector('.loading').classList.remove('d-block');
      if (data.trim() === 'OK') {
        thisForm.querySelector('.sent-message').classList.add('d-block');
        thisForm.reset();
      } else {
        throw new Error(data ? data : 'Ocurrió un error. Por favor, inténtelo más tarde.');
      }
    })
    .catch((error) => {
      if (error.name === 'AbortError') {
        displayError(thisForm, 'La solicitud tardó demasiado. Verifique su conexión e inténtelo nuevamente.');
      } else {
        displayError(thisForm, error);
      }
    })
    .finally(() => clearTimeout(timeoutId));
  }

  function displayError(thisForm, error) {
    thisForm.querySelector('.loading').classList.remove('d-block');
    thisForm.querySelector('.error-message').textContent = error instanceof Error ? error.message : String(error);
    thisForm.querySelector('.error-message').classList.add('d-block');
  }

})();
