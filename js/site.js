// Variables / data sotrage
var jsonData = {};
var editRowId = 0;
var hasInvalidField = false;
var currTabIndex = 0;

function init() {
    $.ajax({
        type: "get",
        url: "https://api.myjson.com/bins/1fwclf",
        dataType: "json",
        success: function (response) {
            console.log('Data fetched successfully. Begin parse.', response);

            // Create the table and the modal for editing
            createTable('edit-table', response);
            createForm('myModal .modal-body', response);
        }
    });

    $('tbody').sortable({
        update: function (event, ui) {
            rowDropped(ui.item.startPos, ui.item.index());
        },
        start: function (event, ui) {
            ui.item.startPos = ui.item.index();
        }
    });

    $('.modal').on('hidden.bs.modal', function (e) {
        fillTableRows('edit-table');
    });
}

function createForm(formDiv, data) {
    var formBody = $('#' + formDiv);
    formBody.html('');

    // Basically just loop the columns and make inputs for the data
    for (var i = 0; i < data.columns.length; i++) {
        var formElement = document.createElement('div');
        formElement.setAttribute('class', 'form-group');
        $(formElement).html('<label for="exampleInputEmail1">' + data.columns[i].name + '</label>');

        var input = createInput(i, 0);
        input.setAttribute('class', 'form-control');
        input.setAttribute('id', 'dval-' + i);

        formElement.appendChild(input);
        formBody.append(formElement);
    }
}

function createTable(tableDiv, data) {

    // Find the tbody element we are adding the items to
    var tableEle = $('#' + tableDiv + ' > thead');
    jsonData = data;

    // First do the header
    var header = '<tr><th class="dark"></th>';

    data.columns.forEach(function (column) {

        // Test for and evaluate the validation function if needed
        var cache = {};
        if (column.validationFunc) {
            eval('cache.validationFunc = ' + column.validationFunc);
        } else if (column.datatype === 'json') {
            cache.validationFunc = validateJsonInput;
        }

        column._cache = cache;

        // Make the header
        header += '<th class="dark">' + column.name + '</th>';
    });

    header += '</tr>';
    tableEle.html(header);

    fillTableRows(tableDiv);
}


function fillTableRows(tableDiv) {
    var tableBody = $('#' + tableDiv + ' > tbody');
    tableBody.html('');

    // Then do the rows
    for (var x = 0; x < jsonData.data.length; x++) {

        // create the row element
        var tableRow = document.createElement('tr');
        tableRow.setAttribute('id', 'row-' + x);

        // Create the number cell
        var numCell = document.createElement('td');
        numCell.setAttribute('class', 'dark');
        $(numCell).html(x + 1);
        tableRow.appendChild(numCell);

        for (var i = 0; i < jsonData.columns.length; i++) {
            var cell = document.createElement('td');
            cell.appendChild(createInput(i, x));
            tableRow.appendChild(cell);
        }

        tableBody.append(tableRow);
    }
}

function createInput(columnId, rowId) {

    var column = jsonData.columns[columnId];
    var row = jsonData.data[rowId];
    var rowVal = row[columnId];

    // to prevent undefined
    if (!rowVal) {
        rowVal = '';
    }

    var inputEle;

    // Check for an input field on the JSON Data
    if (column.input) {
        if (column.input.type === 'select') {

            // Just a smaller reference for the code
            var values = column.input.data.values;
            var displays = column.input.data.displays;

            // Create our select box
            inputEle = document.createElement('select');
            inputEle.setAttribute('onchange', 'endEdit(this)');

            // make our options
            for (var i = 0; i < values.length; i++) {
                var optionEle = document.createElement('option');
                optionEle.setAttribute('value', values[i]);

                if (values[i] === rowVal) {
                    optionEle.setAttribute('selected', 'true');
                }

                // Add it to the input
                $(optionEle).html(displays[i]);
                inputEle.appendChild(optionEle);
            }
        }
    } else {
        // Based on column type we parse the value a bit differently
        inputEle = document.createElement('input');
        inputEle.setAttribute('ondblclick', 'editRow(' + rowId + ')');
        inputEle.setAttribute('onblur', 'endEdit(this)');

        switch (column.datatype) {
            case "string":
                inputEle.setAttribute('type', 'text');
                break;
            case "json":
                if (rowVal !== '') {
                    rowVal = JSON.stringify(rowVal);
                }
                inputEle.setAttribute('type', 'text');
                break;
            case "number":
                inputEle.setAttribute('type', 'number');
                break;
            case "date":
                inputEle.setAttribute('type', 'date');
                break;
        }

        inputEle.setAttribute('value', rowVal);
    }

    // finish up the input with the common properties
    inputEle.setAttribute('class', 'bound-value');
    inputEle.setAttribute('data-col', columnId);
    inputEle.setAttribute('data-row', rowId);
    inputEle.setAttribute('data-old', rowVal);
    inputEle.setAttribute('ondblclick', 'editRow(' + rowId + ')');
    inputEle.setAttribute('onkeydown', 'keyDown(event)');
    inputEle.setAttribute('tabIndex', (columnId + 1) + (rowId * jsonData.columns.length));

    // return it
    return inputEle;
}


function addNewRow() {
    var rowId = jsonData.data.push(new Array(jsonData.columns.length));
    addRowToTable(rowId - 1);
}

function deleteRow(rowId) {
    // Remove the row fom the array and reload the table
    jsonData.data.splice(rowId, 1);
    fillTableRows('edit-table');
}

function editRow(rowId) {

    editRowId = rowId;
    var columns = jsonData.columns;

    // For each item in the row set the value on the input
    for (var i = 0; i < columns.length; i++) {

        // Parse the value from the row
        var val = jsonData.data[rowId][i];
        if (val != '' && columns[i].datatype === 'json') {
            val = JSON.stringify(val);
        }

        // Update the form input
        var formInput = $('#dval-' + i);
        formInput.val(val);
        formInput.attr('data-col', i);
        formInput.attr('data-row', rowId);
        formInput.attr('data-old', val);
    }

    // present the modal
    $('#myModal').modal('show');
}

function endEdit(input) {

    // Enusre we have an input element
    var inputEle = $(input);
    if (!inputEle) {
        return;
    }

    // Get the column/row info 
    var columnId = inputEle.attr('data-col');
    var rowId = inputEle.attr('data-row');
    var column = jsonData.columns[columnId];

    // Pull the values out
    var oldVal = inputEle.attr('data-old');
    var newVal = inputEle.val();

    // If we changed the value, test for valid
    if (oldVal !== newVal && !validateInput(newVal, column)) {
        // Not valid, highlight the cell, focus, and flag invalid
        inputEle.css('border', '2px solid red');
        inputEle.focus();
        hasInvalidField = true;
        return;
    }

    // Ensure we store the JSON parsed value 
    if (column.datatype === 'json' && newVal.length > 0) {
        newVal = JSON.parse(newVal);
    }

    // Update the array and the current input value
    inputEle.css('border', '');
    jsonData.data[rowId][columnId] = newVal;
    inputEle.attr('data-old', newVal);
    hasInvalidField = false;
}

function cancelEdit(input) {
    // Set the value to the original value
    var inputEle = $(input);
    inputEle.val(inputEle.attr('data-old'));
}

function nextRow() {
    // Don't proceed if invalid field
    if (hasInvalidField) {
        return;
    }

    // Set the next rowID
    var newId = editRowId + 1;
    if (newId >= jsonData.data.length) {
        newId = jsonData.data.length - 1;
    }

    editRow(newId);
}

function previousRow() {
    // Don't proceed if invalid field
    if (hasInvalidField) {
        return;
    }

    // Set the next rowID
    var newId = editRowId - 1;
    if (newId < 0) {
        newId = 0;
    }

    editRow(newId);
}


// Helper functions
function validateInput(newValue, column) {

    // If we have a validation function, use it!
    if (column._cache.validationFunc) {
        return column._cache.validationFunc(newValue);
    }

    // If no validation, then return true
    return true;
}

function validateJsonInput(input) {

    // Ensure we have a value
    if (!input) {
        return false;
    }

    // Test to see if we can convert the input to a json object
    try {
        var y = JSON.parse(input);
        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
}

function rowDropped(oldIndex, newIndex) {
    // If no change, no need to parse
    if (oldIndex === newIndex) {
        return;
    }

    // Move the old row index to the new one
    var rowData = jsonData.data[oldIndex];
    jsonData.data.splice(oldIndex, 1);
    jsonData.data.splice(newIndex, 0, rowData);

    // refresh the table
    fillTableRows('edit-table');
}

function keyDown(event) {
    // Escape = cancel edits return to default, delete = delete the row
    if (event.key === 'Escape') {
        cancelEdit(event.target);
    } else if (event.key === 'Delete') {
        deleteRow($(event.target).attr('data-row'));
    }
}