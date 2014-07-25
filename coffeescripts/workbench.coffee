window.moonropeGUI = 
  
  paramEditor: null
  disabled: false
  
  currentRequestValues: ->
    object = {}
    object['host']        = this.hostValue()
    object['controller']  = this.controllerValue()
    object['action']      = this.actionValue()
    object['params']      = this.paramsValue()
    object['headers']     = this.headersValue()
    object
  
  saveRequestValues: ->
    if mwbJS?
      mwbJS.saveState_(JSON.stringify(this.currentRequestValues()))
    else if localStorage?
      localStorage.setItem("requestValues", JSON.stringify(this.currentRequestValues()))
  
  loadRequestValues: ->
    
    if mwbJS?
      values = mwbJS.currentState()
    else if localStorage?
      values = localStorage.requestValues
    else
      values = null
    
    if values
      values = JSON.parse(values)
      $('input[name=host]').val(values.host)
      $('input[name=controller]').val(values.controller)
      $('input[name=action]').val(values.action)
      this.paramEditor.getSession().setValue(values.params)
      if values.headers
        $.each values.headers, (key, value)->
          template = $("form#request fieldset.headers li").html()
          headerRow = $("<li>#{template}</li>")
          if key.length > 0
            $('input[name=key]', headerRow).val(key)
            $('input[name=value]', headerRow).val(value)
            $("form#request fieldset.headers ul").append(headerRow)
  
  makeRequest: ->
    this.removeEmptyHeaders()
    this.saveRequestValues()
    this.disableForm()
    $('div.response div.window').hide()
    this.startRequest()
    
  disableForm: ->
    this.disabled = true
    $('input').prop('disabled', true)
    this.paramEditor.setOptions({readOnly: true})
  
  enableForm: ->
    $('input').prop('disabled', false)
    this.paramEditor.setOptions({readOnly: false})
    this.disabled = false
    
  removeEmptyHeaders: ->
    $('fieldset.headers ul li:not(.template)').each ->
      if $('input[name=key]', $(this)).val().length == 0
        $(this).remove()
  
  hostValue: ->
    $('input[name=host]').val()
    
  controllerValue: ->
    $('input[name=controller]').val()
    
  actionValue: ->
    $('input[name=action]').val()
    
  paramsValue: ->
    this.paramEditor.getSession().getValue()
    
  headersValue: -> 
    headers = {}
    $('fieldset.headers ul li').each ->
      key = $('input[name=key]', $(this)).val()
      value = $('input[name=value]', $(this)).val()
      if key.length
        headers[key] = value
    headers
  
  urlToRequest: ->
    "#{this.hostValue()}/api/v1/#{this.controllerValue()}/#{this.actionValue()}"
  
  receiveResponse: (data, headers = {})->
    #
    # Re-enable the form
    #
    this.enableForm()

    # 
    # Set the time
    #    
    if data.time?
      $('div.response div.time b').text(data.time)
      $('div.response div.time').show()
    else
      $('div.response div.time').hide()
    
    #
    # Set the status
    #
    switch data.status
      when 'success'
        $('div.response div.status').attr('class', 'status success').text('Success')
      when 'access-denied'
        $('div.response div.status').attr('class', 'status access-denied').text('Access Denied')
      when 'parameter-error'
        $('div.response div.status').attr('class', 'status parameter-error').text('Parameter Error')
      when 'validation-error'
        $('div.response div.status').attr('class', 'status validation-error').text('Validation Error')
      when 'internal-server-error'
        $('div.response div.status').attr('class', 'status internal-server-error').text('Internal Server Error')
      else
        $('div.response div.status').attr('class', 'status').text(data.status)
    
    #
    # Add the data
    #
    $('div.response pre.data').html(highlightJSON(data.data))
    
    #
    # Add headers
    #
    headersTable = $('table.headers')
    $('tr', headersTable).remove()
    $.each headers, (index, header)->
      parts = header.split(/\:\s+/)
      if parts[0].length
        $("<tr><th>#{parts[0]}</th><td>#{parts[1]}</td></tr>").appendTo(headersTable)
    
    #
    # Add flags
    #
    flagsTable = $('table.flags')
    $('tr', flagsTable).remove()
    $.each data.flags, (key, value)->
      value = highlightJSON(value)
      $("<tr><th>#{key}</th><td><pre>#{value}</pre></td></tr>").appendTo(flagsTable)
      
    #
    # Set up the UI
    #
    $('div.response div.window').show()
    $('div.response div.welcome').hide()
    $('div.response .tab').hide()
    $('div.response .tab-data').show()
    $('div.response ul.nav li a').removeClass('active')
    $('div.response ul.nav li:first-child a').addClass('active')
    
  receiveError: (status, data)->
    #
    # Re-enable the form
    this.enableForm()
    $('div.response div.welcome').show()

    #
    # Display an alert based on what happens.
    # 
    switch status
      when 400
        if data.status == 'invalid-controller-or-action'
          alert("The controller/action entered do not exist... check and try again.")
        else if data.status == 'invalid-json'
          alert("Invalid JSON provided. #{data.details}}")
      when 500
        # Create a "fake" response for the 500 error.
        this.receiveResponse({data: data, flags: [], status:'internal-server-error'}, [])
      else
        alert("An error occurred which was unknown. Error code #{status}.")
  
  startRequest: ->
    $.ajax
      url: this.urlToRequest()
      method: 'POST'
      headers: this.headersValue()
      data: { params: this.paramsValue() }
      success: (data, textStatus, request)->
        moonropeGUI.receiveResponse(data, moonropeGUI.headersToObject(request.getAllResponseHeaders()))
      error: (xhr, textStatus)->
        if xhr.getResponseHeader('content-type') == 'application/json'
          moonropeGUI.receiveError(xhr.status, JSON.parse(xhr.responseText), moonropeGUI.headersToObject(xhr.getAllResponseHeaders()));
        else
          moonropeGUI.enableForm()
          alert('Could not make request to the host provided. Please check your hostname is correct and your internet connection is working.')
  
  headersToObject: (headers)->
    headers = headers.split("\n")
    headers
    
  resetForm: ->
    $('input[type=text]').val('')
    this.paramEditor.getSession().setValue('{\n  \n}')
    this.removeEmptyHeaders()
    $('div.response div.window').hide()
    $('div.response div.welcome').show()
    this.saveRequestValues()  
  
$ ->
  #
  # Set up the parameter editor
  #
  moonropeGUI.paramEditor = ace.edit("paramEditor")
  moonropeGUI.paramEditor.setTheme("ace/theme/tomorrow")
  moonropeGUI.paramEditor.getSession().setMode("ace/mode/javascript")
  moonropeGUI.paramEditor.setOptions({highlightActiveLine: false, fontSize:'14px', tabSize: 2})
  
  #
  # Load existing values from stroage on page load
  #
  moonropeGUI.loadRequestValues()
  
  #
  # First field
  #
  $('input[name=host]').focus()
  
  #
  # Header addition
  #
  $('form#request fieldset.headers a').on 'click', ->
    unless moonropeGUI.disabled
      template = $("form#request fieldset.headers li.template").html()
      $("form#request fieldset.headers ul").append($("<li>#{template}</li>"))
    return false
  
  #
  # Make requests
  #
  $('form#request button[name=go]').on 'click', ->
    moonropeGUI.makeRequest()
    false
  
  #
  # Reset
  # 
  $('form#request button[name=reset]').on 'click', ->
    moonropeGUI.resetForm()
    false
  
  #
  # Stop form submissions
  #
  $('body').on 'submit', 'form', ->
    false
  
  #
  # Response Navigation
  #
  $('div.response ul.nav a').on 'click', ->
    $('div.response ul.nav a').removeClass('active')
    $(this).addClass('active')
    $('div.response .tab').hide()
    $('div.response .tab-' + $(this).attr('href').replace('#', '')).show()
    false

#
# Keyboard shortcuts
#
Mousetrap.stopCallback = -> false
Mousetrap.bind ['command+enter', 'ctrl+enter', 'command+r'], ->
  moonropeGUI.makeRequest()
  false
