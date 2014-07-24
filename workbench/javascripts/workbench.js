(function() {
  window.moonropeGUI = {
    paramEditor: null,
    disabled: false,
    currentRequestValues: function() {
      var object;
      object = {};
      object['host'] = this.hostValue();
      object['controller'] = this.controllerValue();
      object['action'] = this.actionValue();
      object['params'] = this.paramsValue();
      object['headers'] = this.headersValue();
      return object;
    },
    saveRequestValues: function() {
      return localStorage.setItem("requestValues", JSON.stringify(this.currentRequestValues()));
    },
    loadRequestValues: function() {
      var values;
      if (values = localStorage.requestValues) {
        values = JSON.parse(values);
        $('input[name=host]').val(values.host);
        $('input[name=controller]').val(values.controller);
        $('input[name=action]').val(values.action);
        this.paramEditor.getSession().setValue(values.params);
        if (values.headers) {
          return $.each(values.headers, function(key, value) {
            var headerRow, template;
            template = $("form#request fieldset.headers li").html();
            headerRow = $("<li>" + template + "</li>");
            if (key.length > 0) {
              $('input[name=key]', headerRow).val(key);
              $('input[name=value]', headerRow).val(value);
              return $("form#request fieldset.headers ul").append(headerRow);
            }
          });
        }
      }
    },
    makeRequest: function() {
      this.removeEmptyHeaders();
      this.saveRequestValues();
      this.disableForm();
      $('div.response div.window').hide();
      return this.startRequest();
    },
    disableForm: function() {
      this.disabled = true;
      $('input').prop('disabled', true);
      return this.paramEditor.setOptions({
        readOnly: true
      });
    },
    enableForm: function() {
      $('input').prop('disabled', false);
      this.paramEditor.setOptions({
        readOnly: false
      });
      return this.disabled = false;
    },
    removeEmptyHeaders: function() {
      return $('fieldset.headers ul li:not(.template)').each(function() {
        if ($('input[name=key]', $(this)).val().length === 0) {
          return $(this).remove();
        }
      });
    },
    hostValue: function() {
      return $('input[name=host]').val();
    },
    controllerValue: function() {
      return $('input[name=controller]').val();
    },
    actionValue: function() {
      return $('input[name=action]').val();
    },
    paramsValue: function() {
      return this.paramEditor.getSession().getValue();
    },
    headersValue: function() {
      var headers;
      headers = {};
      $('fieldset.headers ul li').each(function() {
        var key, value;
        key = $('input[name=key]', $(this)).val();
        value = $('input[name=value]', $(this)).val();
        if (key.length) {
          return headers[key] = value;
        }
      });
      return headers;
    },
    urlToRequest: function() {
      return "" + (this.hostValue()) + "/api/v1/" + (this.controllerValue()) + "/" + (this.actionValue());
    },
    receiveResponse: function(data, headers) {
      var flagsTable, headersTable;
      if (headers == null) {
        headers = {};
      }
      this.enableForm();
      if (data.time != null) {
        $('div.response div.time b').text(data.time);
        $('div.response div.time').show();
      } else {
        $('div.response div.time').hide();
      }
      switch (data.status) {
        case 'success':
          $('div.response div.status').attr('class', 'status success').text('Success');
          break;
        case 'access-denied':
          $('div.response div.status').attr('class', 'status access-denied').text('Access Denied');
          break;
        case 'parameter-error':
          $('div.response div.status').attr('class', 'status parameter-error').text('Parameter Error');
          break;
        case 'validation-error':
          $('div.response div.status').attr('class', 'status validation-error').text('Validation Error');
          break;
        case 'internal-server-error':
          $('div.response div.status').attr('class', 'status internal-server-error').text('Internal Server Error');
          break;
        default:
          $('div.response div.status').attr('class', 'status').text(data.status);
      }
      $('div.response pre.data').html(highlightJSON(data.data));
      headersTable = $('table.headers');
      $('tr', headersTable).remove();
      $.each(headers, function(index, header) {
        var parts;
        parts = header.split(/\:\s+/);
        if (parts[0].length) {
          return $("<tr><th>" + parts[0] + "</th><td>" + parts[1] + "</td></tr>").appendTo(headersTable);
        }
      });
      flagsTable = $('table.flags');
      $('tr', flagsTable).remove();
      $.each(data.flags, function(key, value) {
        value = highlightJSON(value);
        return $("<tr><th>" + key + "</th><td><pre>" + value + "</pre></td></tr>").appendTo(flagsTable);
      });
      $('div.response div.window').show();
      $('div.response div.welcome').hide();
      $('div.response .tab').hide();
      $('div.response .tab-data').show();
      $('div.response ul.nav li a').removeClass('active');
      return $('div.response ul.nav li:first-child a').addClass('active');
    },
    receiveError: function(status, data) {
      this.enableForm();
      $('div.response div.welcome').show();
      switch (status) {
        case 400:
          if (data.status === 'invalid-controller-or-action') {
            return alert("The controller/action entered do not exist... check and try again.");
          } else if (data.status === 'invalid-json') {
            return alert("Invalid JSON provided. " + data.details + "}");
          }
          break;
        case 500:
          return this.receiveResponse({
            data: data,
            flags: [],
            status: 'internal-server-error'
          }, []);
        default:
          return alert("An error occurred which was unknown. Error code " + status + ".");
      }
    },
    startRequest: function() {
      return $.ajax({
        url: this.urlToRequest(),
        method: 'POST',
        headers: this.headersValue(),
        data: {
          params: this.paramsValue()
        },
        success: function(data, textStatus, request) {
          return moonropeGUI.receiveResponse(data, moonropeGUI.headersToObject(request.getAllResponseHeaders()));
        },
        error: function(xhr, textStatus) {
          if (xhr.getResponseHeader('content-type') === 'application/json') {
            return moonropeGUI.receiveError(xhr.status, JSON.parse(xhr.responseText), moonropeGUI.headersToObject(xhr.getAllResponseHeaders()));
          } else {
            moonropeGUI.enableForm();
            return alert('Could not make request to the host provided. Please check your hostname is correct and your internet connection is working.');
          }
        }
      });
    },
    headersToObject: function(headers) {
      headers = headers.split("\n");
      return headers;
    },
    resetForm: function() {
      $('input[type=text]').val('');
      this.paramEditor.getSession().setValue('{\n  \n}');
      this.removeEmptyHeaders();
      $('div.response div.window').hide();
      $('div.response div.welcome').show();
      return this.saveRequestValues();
    }
  };

  $(function() {
    moonropeGUI.paramEditor = ace.edit("paramEditor");
    moonropeGUI.paramEditor.setTheme("ace/theme/tomorrow");
    moonropeGUI.paramEditor.getSession().setMode("ace/mode/javascript");
    moonropeGUI.paramEditor.setOptions({
      highlightActiveLine: false,
      fontSize: '14px',
      tabSize: 2
    });
    moonropeGUI.loadRequestValues();
    $('form#request fieldset.headers a').on('click', function() {
      var template;
      if (!moonropeGUI.disabled) {
        template = $("form#request fieldset.headers li.template").html();
        $("form#request fieldset.headers ul").append($("<li>" + template + "</li>"));
      }
      return false;
    });
    $('form#request button[name=go]').on('click', function() {
      moonropeGUI.makeRequest();
      return false;
    });
    $('form#request button[name=reset]').on('click', function() {
      moonropeGUI.resetForm();
      return false;
    });
    $('form').on('submit', function() {
      return false;
    });
    return $('div.response ul.nav a').on('click', function() {
      $('div.response ul.nav a').removeClass('active');
      $(this).addClass('active');
      $('div.response .tab').hide();
      $('div.response .tab-' + $(this).attr('href').replace('#', '')).show();
      return false;
    });
  });

  Mousetrap.stopCallback = function() {
    return false;
  };

  Mousetrap.bind(['command+enter', 'ctrl+enter'], function() {
    moonropeGUI.makeRequest();
    return false;
  });

}).call(this);
