function init() {
    $.ajax({
        type: "get",
        url: "https://api.myjson.com/bins/o10zv",
        dataType: "json",
        success: function (response) {
            console.log('Data fetched successfully. Begin parse.', response);

            // Create the table and the modal for editing
            buildTable(response);
            buildModal(response);
        }
    });
}


var jsonData;
function buildTable(data) {

    // Find the tbody element we are adding the items to
    var tableEle = $('#edit-table > tbody');
    jsonData = data;

    // First do the header
    var header = '<tr>';

    data.columns.forEach(function (column) {
        header += '<th>' + column.name + '</th>';
    });

    header += '</tr>';
    tableEle.html(header);

    // Then do the rows
    for (var x = 0; x < data.data.length; x++) {
        addRowToTable(x);
    }
}

function buildModal(data) {

    // Basically just loop the columns and make inputs for the data


}

function addRowToTable(rowId) {

    var tableEle = $('#edit-table > tbody');
    var rowHtml = '<tr id="row-' + rowId + '">';

    var row = jsonData.data[rowId];

    for (var i = 0; i < jsonData.columns.length; i++) {
        rowHtml += '<td>' + createTableCell(i, rowId) + '</td>';
    }

    rowHtml += '<td>';
    rowHtml += '<button class="btn btn-small btn-primary" onclick="editRow(' + rowId + ')">Edit</button> ';
    rowHtml += '<button class="btn btn-small btn-danger" onclick="deleteRow(' + rowId + ')">Delete</button> ';
    rowHtml += '</td></tr>';

    tableEle.append(rowHtml);
}

function createTableCell(columnId, rowId) {

    var column = jsonData.columns[columnId];
    var row = jsonData.data[rowId];
    var rowVal = row[columnId];

    if (!rowVal) {
        rowVal = '';
    }

    // Based on column type we parse the value a bit differently
    var cellString = '<input id="data-' + rowId + '-' + columnId + '" onkeydown=keyDown(event) onblur=endEdit(this) type="';
    switch (column.datatype) {
        case "string":
            cellString += 'text" value="' + rowVal + '"';
            break;
        case "json":
            if (rowVal !== '') {
                rowVal = JSON.stringify(rowVal).replace(/"/g, "'");
            }
            cellString += 'text" value="' + rowVal + '"';
            break;
        case "number":
            cellString += 'number" value="' + rowVal + '"';
            break;
        case "date":
            cellString += 'date" value="' + rowVal + '"';
            break;
    }

    cellString += '" data-old="' + rowVal + '"></input>';
    return cellString;
}

function keyDown(event) {

    if (event.key === 'Escape') {
        cancelEdit(event.target);
    }
}


function addNewRow() {
    var rowId = jsonData.data.push(new Array(jsonData.columns.length));
    addRowToTable(rowId - 1);
}

function deleteRow(rowId) {
    var row = $('#row-' + rowId);
    console.log(row);
    row.remove();

    delete jsonData.data[rowId];
}

function editRow(rowId) {
    $('#myModal').modal('show');
}

function endRowEdit() {

}

function cancelRowEdit() {

}

function endEdit(input) {

    var inputEle = $(input);
    var fieldInfo = inputEle.attr('id').split('-');
    var column = jsonData.columns[+fieldInfo[2]];
    var row = jsonData.data[+fieldInfo[1]];

    var oldVal = inputEle.data('old');
    var newVal = inputEle.val();

    if (oldVal !== newVal && !validateInput(newVal, row, column)) {
        inputEle.css('border', '2px solid red');
        inputEle.focus();
        return;
    }

    // Update the array and the current input value
    inputEle.css('border', '');
    row[+fieldInfo[2]] = newVal;
    inputEle.attr('data-old', newVal);
}

function cancelEdit(input) {
    // Set the value to the original value
    var inputEle = $(input);
    inputEle.val(inputEle.data('old'));
    tableEle = $('#edit-table > tbody').focus();
}


// Validation functions
function validateInput(newValue, row, column) {

    if (column.validationFunc) {
        // If we have a validation function, use it!
        eval('var validate = ' + column.validationFunc);
        // if invalid, let the user know and don't leave input
        return validate(newValue);
    } else if (column.datatype === 'json') {
        return validateJsonInput(newValue.replace(/'/g, '"'));
    }

    return true;
}

function validateJsonInput(input) {

    if (!input) {
        return false;
    }

    try {
        var y = JSON.parse(input);
        return true;
    } catch (e) {
        console.log(e);
        return false;
    }
}