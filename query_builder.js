var tables = [];
var selectedTable;
var tableStack = _("table-stack");
var myCanvas = _("myCanvas");
const context = myCanvas.getContext('2d');
var joinStartX = 0;
var joinStartY = 0;
var joinEndX = 0;
var joinEndY = 0;
var isDrawing = false;
var canvasTop = 0;
var canvasLeft = 0;
var showingJoinSelector = false;
var nl = '\n';
var ind = '    '

var droppedTables = [];
var selectedJoins = [];

const joinTypes = [
    "left outer join",
    "right outer join",
    "right excluding join",
    "outer excluding join",
    "full join",
    "left excluding join",
    "inner join"
]

var pendingJoin = {
    tableAName: '',
    tableAColumn: '',
    tableBName: '',
    tableBColumn: '',
    joinType: ''
}

function _(str) {
    var firstChar = str.substring(0,1);
    if (firstChar == '.') {
        str = str.replace('.', '');
        return document.getElementsByClassName(str);
    } else {
        return document.getElementById(str);
    }
} 

myCanvas.addEventListener('mousedown', ev => {
    joinStartX = ev.offsetX;
    joinStartY = ev.offsetY;
    joinEndX = ev.offsetX;
    joinEndY = ev.offsetY;
    isDrawing = true;
});

myCanvas.addEventListener('mousemove', ev => {
    if (isDrawing === true) {
        joinEndX = ev.offsetX;
        joinEndY = ev.offsetY;
        drawLine();
        joinStartX = ev.offsetX;
        joinStartY = ev.offsetY;
    }
});

window.addEventListener('mouseup', ev => {
  if (isDrawing === true) {
    drawLine();
    isDrawing = false;
  }
});

function drawLine() {
    context.beginPath();
    context.strokeStyle = 'black';
    context.lineWidth = 4;
    context.moveTo(joinStartX, joinStartY);
    context.lineTo(joinEndX, joinEndY);
    context.stroke();
    context.closePath();
}

function drawJoins() {
    clearCanvas();

    if (showingJoinSelector == false) {
        resetCells();
    }
    
    highlightJoins();

    for (var i = 0; i < selectedJoins.length; i++) {
        var tableAName = selectedJoins[i]['tableAName'];
        var tableAColumn = selectedJoins[i]['tableAColumn'];
        var tableBName = selectedJoins[i]['tableBName'];
        var tableBColumn = selectedJoins[i]['tableBColumn'];
        var joinType = selectedJoins[i]['joinType'];

        //figure out which table is towards the left
        var leftmostTable = calcLeftmostTable(tableAName, tableBName);

        if (tableAName == leftmostTable) {
            setJoinStartPosition(tableAName, tableAColumn,'right');
            setJoinEndPosition(tableBName, tableBColumn, 'left');
        } else {
            setJoinStartPosition(tableAName, tableAColumn, 'left');
            setJoinEndPosition(tableBName, tableBColumn, 'right');
        }

        drawLine();
    }

}

function highlightJoins() {

    var joinNames = [];
    for (var i = 0; i < selectedJoins.length; i++) {
        var joinOne = selectedJoins[i]['tableAName'] + '~' + selectedJoins[i]['tableAColumn'];
        var joinTwo = selectedJoins[i]['tableBName'] + '~' + selectedJoins[i]['tableBColumn'];
        joinNames.push(joinOne);
        joinNames.push(joinTwo);
    }

    var tableCells = document.getElementsByTagName("td");
    for (var i = 0; i < tableCells.length; i++) {
        var targetCell = tableCells[i];
        var table = targetCell.parentNode.parentNode;
        var tableId = table.id;
        var cellText = getColumnFromTableCell(targetCell.innerHTML);
        var cellName = tableId + '~' + cellText;

        var n = joinNames.includes(cellName);
        if (n == true) {
            targetCell.classList.add("involved");
        } else {
            targetCell.classList.remove("involved");
        }
    }

}

function getColumnFromTableCell(cellContents) {
    var n = cellContents.indexOf(">");
    var columnName = cellContents.slice(0, 0) + cellContents.slice(n+1); 
    return columnName;
}

function clearCanvas() {
    context.clearRect(0, 0, myCanvas.width, myCanvas.height);
}

function getCanvasPositions() {
    var canvasRect = myCanvas.getBoundingClientRect();
    canvasLeft = canvasRect.left;
    canvasTop = canvasRect.top;
}

function setJoinStartPosition(tableName, columnName, joinSide) {
    var tableEl = document.getElementById(tableName);
    var tableCells = tableEl.getElementsByTagName("td");
    for (var i = 0; i < tableCells.length; i++) {
        var cellText = getColumnFromTableCell(tableCells[i].innerHTML);
        if (cellText == columnName) {
            var cellRect = tableCells[i].getBoundingClientRect();
            var cellTop = cellRect.top;
            var cellBtm = cellRect.bottom;
            var cellHeight = cellBtm - cellTop;
            joinStartY = cellTop + (cellHeight / 2);

            if (joinSide == 'right') {
                joinStartX = cellRect.right;
            } else {
                joinStartX = cellRect.left;
            }

            joinStartX = joinStartX - canvasLeft; //the -9 is for the borders
            joinStartY = joinStartY - canvasTop - 6;
        }
    }
}

function setJoinEndPosition(tableName, columnName, joinSide) {
    var tableEl = document.getElementById(tableName);
    var tableCells = tableEl.getElementsByTagName("td");
    for (var i = 0; i < tableCells.length; i++) {
        var cellText = getColumnFromTableCell(tableCells[i].innerHTML);
        if (cellText == columnName) {
            var cellRect = tableCells[i].getBoundingClientRect();
            var cellTop = cellRect.top;
            var cellBtm = cellRect.bottom;
            var cellHeight = cellBtm - cellTop;
            joinEndY = cellTop + (cellHeight / 2);

            if (joinSide == 'right') {
                joinEndX = cellRect.right;
            } else {
                joinEndX = cellRect.left;
            }

            joinEndX = joinEndX - canvasLeft;
            joinEndY = joinEndY - canvasTop - 6;

        }
    }
}

function clearJoins() {
    selectedJoins = [];
    selectedTable = '';
    resetPending();
}

function initTables() {
    populateTableStack();
}

function untickSelectAll(tableId) {
    var checkboxId = 'select-all-from-' + tableId;
    var targetCheckbox = _(checkboxId);

    if (targetCheckbox.checked == true) {
        targetCheckbox.checked = false;
    }
}

function populateTableStack() {

    for (var i = 0; i < tables.length; i++) {
        var table = document.createElement("table");
        table.setAttribute('id', tables[i]['id']);
        table.setAttribute('class', 'hide-cells');
        table.setAttribute('draggable', true);

        var tableHead = document.createElement("th");
        var tableHeadSpan = document.createElement("span");
        tableHeadSpan.innerHTML = tables[i]['id'];
        tableHead.appendChild(tableHeadSpan);
        table.appendChild(tableHead);

        //build a row for 'select *'
        var topRow = document.createElement("tr");
        var topRowCell = document.createElement("td");
        var topRowCheckbox = document.createElement("input");
        topRowCheckbox.setAttribute('type', 'checkbox');
        topRowCheckbox.setAttribute('id', 'select-all-from-' + tables[i]['id']);
        topRowCheckbox.setAttribute('class', 'select-all-checkbox');
        topRowCheckbox.setAttribute('value', 1);
        topRowCheckbox.setAttribute('onclick', `invokeSelectAll("${tables[i]['id']}")`);
        topRowCell.appendChild(topRowCheckbox);

        var topRowCellText = document.createTextNode('*');
        topRowCell.appendChild(topRowCellText);
        topRow.appendChild(topRowCell);
        table.appendChild(topRow);

        var tableColumns = tables[i]['columns'];
        for (var x = 0; x < tableColumns.length; x++) {
            var tableRow = document.createElement("tr");
            table.appendChild(tableRow);
            var tableCell = document.createElement("td");
            tableCell.setAttribute('class', 'selectable');
            tableRow.appendChild(tableCell);

            var checkbox = document.createElement("input");
            checkbox.setAttribute('type', 'checkbox');
            var checkboxId = tables[i]['id'] + '~' + tableColumns[x];
         
            checkbox.setAttribute('id', checkboxId);
            checkbox.setAttribute('value', 1);
            checkbox.setAttribute('onclick', `untickSelectAll("${tables[i]['id']}")`);

            tableCell.appendChild(checkbox);

            var cellText = document.createTextNode(tableColumns[x]);
            tableCell.appendChild(cellText);
        }

        tableStack.appendChild(table);
    }

    watchTableHeadings();
    
}

function watchTableHeadings() {
    var tableHeadings = document.getElementsByTagName("th");
    for (var i = 0; i < tableHeadings.length; i++) {
        tableHeadings[i].addEventListener("mousedown", (ev) => {
            var tableId = ev.target.innerHTML;
            tableId = tableId.replace(/<span>/g, '');
            tableId = tableId.replace(/<\/span>/g, '');
            selectedTable = _(tableId);
        });
    }

    watchTableCells();

}

setInterval(() => {
    cleanUpCanvas();
}, 2000);

function cleanUpCanvas() {

    //ONLY joined cells should be highlighted (unless drawing)
    if ((isDrawing == false) && (pendingJoin.tableAName !== '') && (pendingJoin.tableBName == '')) {
        selectedTable = '';
        resetPending();
    }

}

function watchTableCells() {
    var tableCells = document.getElementsByTagName("td");

    for (var i = 0; i < tableCells.length; i++) {
        tableCells[i].addEventListener("click", (ev) => {

        var clickedElType = ev.target.type;
        var cellText = getColumnFromTableCell(ev.target.innerHTML);

        if ((clickedElType == 'checkbox') || (cellText == '*')) {
            return;
        }

            var table = ev.target.parentNode.parentNode;
            makeTableUnselectable(table);
            var mousePos = getMousePos(myCanvas, ev);

            if (pendingJoin.tableAName == '') {
                ev.target.classList.add('involved');        
                pendingJoin.tableAName = table.id;
                pendingJoin.tableAColumn = getColumnFromTableCell(ev.target.innerHTML);

                joinStartX = mousePos.x;
                joinStartY = mousePos.y;
                isDrawing = true;
                
            } else {
                var table = ev.target.parentNode.parentNode;
                if (table.id == pendingJoin.tableAName) {
                    resetPending();
                    isDrawing = false;
                } else {
                    pendingJoin.tableBName = table.id;
                    pendingJoin.tableBColumn = getColumnFromTableCell(ev.target.innerHTML);
                    drawJoinOptions(); //to get join type       
                }

            }

        });
    }   
}

function resetCells() {

    //clear selected table
    selectedTable = '';

    //make all of the tables selectable
    var htmlTables = document.getElementsByTagName("table");
    for (var i = 0; i < htmlTables.length; i++) {
        htmlTables[i].classList.add("selectable");
    }

    //remove all 'involved' cells
    var tableCells = document.getElementsByTagName("td");
    for (var i = 0; i < tableCells.length; i++) {
        tableCells[i].classList.remove("involved");
    }

}

function resetPending() {
    //reset the pending join
    pendingJoin = {
        tableAName: '',
        tableAColumn: '',
        tableBName: '',
        tableBColumn: '',
        joinType: ''
    }

    //and voila!
    drawJoins();
    // resetCells();
}

function drawJoinOptions() {
    document.getElementById("join-selector").style.display = 'block';
    showingJoinSelector = true;
}

function selectJoin(joinIndex) {
    showingJoinSelector = false;
    document.getElementById("join-selector").style.display = 'none';
    pendingJoin.joinType = joinTypes[joinIndex];
    selectedJoins.push(pendingJoin);
    resetPending();
}

function calcLeftmostTable(tableAName, tableBName) {
    //gets used when drawing a join
    var tableA = document.getElementById(tableAName);
    var domTableA = tableA.getBoundingClientRect();
    var tableALeft = domTableA.left;

    var tableB = document.getElementById(tableBName);
    var domTableB = tableB.getBoundingClientRect();
    var tableBLeft = domTableB.left;

    if (tableALeft<tableBLeft) {
        var leftmostTable = tableAName;
    } else {
        var leftmostTable = tableBName;
    }

    return leftmostTable;
}

function watchTableStack() {
    //listen out for drop events (add to stack and ATTEMPT reduce upon drop)
    tableStack.addEventListener("dragover", (ev) => {
        ev.preventDefault();
    });

    tableStack.addEventListener("drop", (ev) => {
        ev.preventDefault();
        selectedTable.style.position = 'relative';
        selectedTable.style.left = 0;
        selectedTable.style.top = 0;
        selectedTable.classList.add('hide-cells');
        tableStack.appendChild(selectedTable);
        clearRemovedTable(selectedTable);
        attemptReduceSelectedJoins(selectedTable.id);
    });
}

function arrayRemove(arr, value) { 
    return arr.filter(function(ele){ 
        return ele != value; 
    });
}

function clearRemovedTable(selectedTable) {
    makeTableUnselectable(selectedTable);
    
    //remove this table from droppedTables 
    var tableId = selectedTable.id;
    droppedTables = arrayRemove(droppedTables, tableId);

    var newSelectedJoins = [];
    for (var i = 0; i < selectedJoins.length; i++) {
        var tableAName = selectedJoins[i]['tableAName'];
        var tableBName = selectedJoins[i]['tableBName'];

        if (( tableAName !== tableId) && (tableBName !== tableId)) {
            //remove this join from selected selectedJoins 
            newSelectedJoins.push(selectedJoins[i]);
        }

    }

    selectedJoins = newSelectedJoins;

    var checkboxes = document.querySelectorAll('#' + tableId + ' td input[type="checkbox"]');
    for (var i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = false;
    }

    drawJoins();
}

function attemptReduceSelectedJoins(tableId) {

    setTimeout(() => {
        for (var i = 0; i < selectedJoins.length; i++) {
            var tableAName = selectedJoins[i]['tableAName'];
            var tableBName = selectedJoins[i]['tableBName'];
            if ((tableAName == tableId) || (tableBName == tableId)) {
                selectedJoins.splice(i, 1);
            }
        } 

        drawJoins();
    }, 500)

}

function watchCanvas() {
    //listens out for drop events
    myCanvas.addEventListener("dragover", (ev) => {
        ev.preventDefault();
    });

    myCanvas.addEventListener("drop", (ev) => {
        ev.preventDefault();
        var body = document.getElementsByTagName('body')[0];
        body.appendChild(selectedTable);
        selectedTable.style.position = 'absolute';
        selectedTable.style.left = ev.clientX + 'px';
        selectedTable.style.top = ev.clientY + 'px';
        selectedTable.classList.remove('hide-cells');

        if (droppedTables.includes(selectedTable.id) == false) {
            droppedTables.push(selectedTable.id);
        }

        drawJoins();
    })

}

function copySQL() {
  var copyBtnText = _("copy-btn").innerHTML;
  if (copyBtnText !== 'Copy SQL') {
    modifyCloseBtn();
    hideSQL();
  } else {
    var sqlEl = document.querySelector("#sql");
    var text = sqlEl.value;
    navigator.clipboard.writeText(text);
    _("copy-btn").innerHTML = 'copied!';
    setTimeout(() => {
    hideSQL();
    _("copy-btn").innerHTML = 'Copy SQL';
    }, 633);
  }
}

function hideSQL() {
    _("sql-code").style.display = 'none';
    _("show-sql-btn").style.display = 'inline-block';
    _("hide-sql-btn").style.display = 'none';
}

function makeTableUnselectable(targetTable) {
    var tableCells = targetTable.getElementsByTagName("td");
    for (var i = 0; i < tableCells.length; i++) {
        tableCells[i].classList.remove("selectable");
    }
}

function getMousePos(targetEl, ev) {
    var rect = targetEl.getBoundingClientRect();
    /// as mouse event coords are relative to document you need to
    /// subtract the element's left and top position:
    return {x: ev.clientX - rect.left, y: ev.clientY - rect.top};
}

function attemptTableFlipFix(primaryTable) {
    var declaredTableAList = [];
    var declaredTableBList = [];

    declaredTableBList.push(primaryTable);

    for (var i = 0; i < selectedJoins.length; i++) {

        var tableAName = selectedJoins[i]['tableAName'];
        var tableAColumn = selectedJoins[i]['tableAColumn'];
        var tableBName = selectedJoins[i]['tableBName'];
        var tableBColumn = selectedJoins[i]['tableBColumn'];

        //check to see if tableA and tableB conflict with previously declared things 
        var x = declaredTableAList.includes(tableAName);
        var y = declaredTableBList.includes(tableBName);

        if ((x == true) || (y == true)) {
            //conflicts with previously declared vibe! 
            selectedJoins[i]['tableAName'] = tableBName;
            selectedJoins[i]['tableAColumn'] = tableBColumn;
            selectedJoins[i]['tableBName'] = tableAName;
            selectedJoins[i]['tableBColumn'] = tableAColumn; 
        }

        //add to declaredTable vibes... 
        declaredTableAList.push(selectedJoins[i]['tableAName']);
        declaredTableBList.push(selectedJoins[i]['tableBName']);
    }
}


function buildSQL() {
    var sql = '';
    var errorMsg = ''

    if (droppedTables<1) {
        errorMsg = 'You did not select any tables!';
    }

    if ((selectedJoins<1) && (errorMsg == '')) {
        errorMsg = 'You did not draw any table joins!';
    }


    if (errorMsg == '') {

        //figure out how many selected boxes we have
        var numCheckedBoxes = 0;
        for (var t = 0; t < droppedTables.length; t++) {     
            var checkboxes = document.querySelectorAll('#' + droppedTables[t] + ' td input[type="checkbox"]');
            for (var i = 0; i < checkboxes.length; i++) {
                if (checkboxes[i].checked == true) {
                    numCheckedBoxes++;
                }
            }
          
        }

        if (numCheckedBoxes<1) {
            errorMsg = 'You did select any table columns to fetch!';
        }

    }

    if (errorMsg !== '') {
        sql = errorMsg
        
        setTimeout(() => {
            modifyCloseBtn();
        }, 1)

    } else {

        //let's figure out what the primary table is
        var primaryTable = selectedJoins[0]['tableAName'];
        attemptTableFlipFix(primaryTable);
        sql = 'SELECTOIDS FROM' + nl + ind + primaryTable
        sql = addSelectoids(sql)
        sql = addJoinClauses(sql)
    }

    return sql
}

function modifyCloseBtn() {
    var copyBtnText = _("copy-btn").innerHTML;

    if (copyBtnText == 'Copy SQL') {
        var newText = 'Close Window';
    } else {
        var newText = 'Copy SQL';
    }

    _("copy-btn").innerHTML = newText;
}

function addSelectoids(sql) {
    var selectoids = 'SELECT';

    var selectAllStr = 'select-all-from-';

    //make sure those table cells are the correct color!
    for (var t = 0; t < droppedTables.length; t++) {     
        var checkboxes = document.querySelectorAll('#' + droppedTables[t] + ' td input[type="checkbox"]');
        for (var i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].checked == true) {
                var checkboxId = nl + ind + checkboxes[i]['id'] + ',';
                checkboxId = checkboxId.replace('~', '.');

                var n =checkboxId.includes(selectAllStr);

                if (n == true) {
                    checkboxId = checkboxId.replace(selectAllStr, '');
                    checkboxId = checkboxId.replace(',', '.*,');
                }

                console.log('HEY: checkboxId is ' + checkboxId)

                selectoids += checkboxId;
            }
        }
      
    }

    selectoids+= '~~FIN'

    selectoids = selectoids.replaceAll(',~~FIN', '');
    newSql = sql.replace('SELECTOIDS', selectoids);
    return newSql;
}

function addJoinClauses(sql) {
    var joinClauses = ''

/*
    sample join...

    {
      "tableAName": "drivers",
      "tableAColumn": "first_name",
      "tableBName": "licenses",
      "tableBColumn": "id",
      "joinType": "inner join"
    }

    "left outer join",
    "right outer join",
    "right excluding join",
    "outer excluding join",
    "full join",
    "left excluding join",
    "inner join"


*/

    for (var i = 0; i <selectedJoins.length; i++) {

        switch(selectedJoins[i]['joinType']) {
            case 'right excluding join':
                newJoinClause = getJoinClauseRightExcluding(selectedJoins[i]);
                break;
            case 'full join':
                newJoinClause = getJoinClauseFullJoin(selectedJoins[i], sql);
                break;
            case 'outer excluding join':
                newJoinClause = getJoinClauseOuterExcludingJoin(selectedJoins[i], sql);
                break;
            case 'left excluding join':
                newJoinClause = getJoinClauseLeftExcluding(selectedJoins[i]);
                break;
            default: //innerJoin, left outer or right outer
                newJoinClause = getJoinClauseDefault(selectedJoins[i]);
        }

        joinClauses += newJoinClause
    }

    var newSql = sql + joinClauses
    return newSql
}

function getJoinClauseFullJoin(selectedJoinObj, sql) {

    selectedJoinObj.joinType = 'left outer join';
    //get code for a left outer join
    var leftJoinCode = getJoinClauseDefault(selectedJoinObj)

    var thisJoin = leftJoinCode + nl + 'UNION' + nl + sql

    selectedJoinObj.joinType = 'right outer join';
    //get code for a right outer join
    var rightJoinCode = getJoinClauseDefault(selectedJoinObj)

    thisJoin = thisJoin.replace(nl + 'LEFT OUTER JOIN', 'LEFT OUTER JOIN')
    thisJoin += rightJoinCode  
    thisJoin = thisJoin.replace(nl + 'RIGHT OUTER JOIN', 'RIGHT OUTER JOIN')
    return thisJoin;
}

function getJoinClauseOuterExcludingJoin(selectedJoinObj, sql) {

    selectedJoinObj.joinType = 'left excluding join';
    //get code for a left outer join
    var leftJoinCode = getJoinClauseLeftExcluding(selectedJoinObj)

    var thisJoin = nl + leftJoinCode + nl + 'UNION ALL' + nl + sql

    selectedJoinObj.joinType = 'right excluding join';
    //get code for a right outer join
    var rightJoinCode = getJoinClauseRightExcluding(selectedJoinObj)

    thisJoin += nl + rightJoinCode  
    return thisJoin;
}

function getJoinClauseLeftExcluding(selectedJoinObj) {
    var defaultJoin = getJoinClauseDefault(selectedJoinObj);
    var additionalCode = nl + 'WHERE' + nl;
    var foreignKey = selectedJoinObj.tableBName + '.' + selectedJoinObj.tableBColumn
    additionalCode+= ind + foreignKey + ' IS NULL'
    var thisJoin = defaultJoin + additionalCode;
    thisJoin = thisJoin.replace(' EXCLUDING ', ' ');
    thisJoin =  thisJoin.replaceAll('LEFT JOIN', nl + 'LEFT JOIN');
    return thisJoin;
}

function getJoinClauseRightExcluding(selectedJoinObj) {
    var defaultJoin = getJoinClauseDefault(selectedJoinObj);
    var additionalCode = nl + 'WHERE' + nl;
    var foreignKey = selectedJoinObj.tableAName + '.' + selectedJoinObj.tableAColumn
    additionalCode+= ind + foreignKey + ' IS NULL'
    var thisJoin = defaultJoin + additionalCode;
    thisJoin = thisJoin.replace(' EXCLUDING ', ' ');
    thisJoin =  thisJoin.replaceAll('RIGHT JOIN', nl + 'RIGHT JOIN');
    return thisJoin;
}

function getJoinClauseDefault(selectedJoinObj) {
    var tableAName = selectedJoinObj.tableAName;
    var tableBName = selectedJoinObj.tableBName;
    var tableAColumn = selectedJoinObj.tableAColumn;
    var tableBColumn = selectedJoinObj.tableBColumn;

    var joinName = selectedJoinObj.joinType.toUpperCase();
    var joinCode = joinName + nl + ind + tableBName;
    joinCode+= nl + 'ON' + nl;
    var connection = ind + `${tableAName}.${tableAColumn} = ${tableBName}.${tableBColumn}`;
    joinCode+= connection;
    return joinCode;
}

function invokeSelectAll(tableId) {
    //make all of the other checkboxes NOT checked
    var checkboxId = 'select-all-from-' + tableId;
    var targetCheckbox = _(checkboxId);

    if (targetCheckbox.checked == true) {
        var targetTable = _(tableId);
        var checkboxes = targetTable.getElementsByTagName("input");
        for (var i = 0; i < checkboxes.length; i++) {
            if (i>0) {
                checkboxes[i].checked = false;
            }       
        }
    }

}

function restart() {

    selectedJoins = [];
    droppedTables = [];
    selectedTable = '';
    resetPending();

    //remove all current tables from the screen
    var currentTables = document.getElementsByTagName("table");

    for (var i = currentTables.length - 1; i >= 0; i--) {
        currentTables[i].remove();
    }

    initTables();
    hideSQL();
}

function showSQL() {
    _("sql-code").style.display = 'block';
    _("show-sql-btn").style.display = 'none';
    _("hide-sql-btn").style.display = 'inline-block';
    _("join-selector").style.display = 'none';
    //_("sql").value = sqlQuery;

    var sqlQuery = buildSQL();
        var niceQuery = sqlQuery.replace(/FROM/g, '\nFROM');
        var niceQuery = niceQuery.replace(/LEFT OUTER JOIN/g, '\nLEFT OUTER JOIN');
        var niceQuery = niceQuery.replace(/RIGHT OUTER JOIN/g, '\nRIGHT OUTER JOIN');
        var niceQuery = niceQuery.replace(/RIGHT EXCLUDING JOIN/g, '\nRIGHT EXCLUDING JOIN');
        var niceQuery = niceQuery.replace(/FULL JOIN/g, '\nFULL JOIN');
        var niceQuery = niceQuery.replace(/LEFT EXCLUDING JOIN/g, '\nLEFT EXCLUDING JOIN');
        var niceQuery = niceQuery.replace(/INNER JOIN/g, '\nINNER JOIN');
        var niceQuery = niceQuery.trim();
        _("sql").value = niceQuery;
}

watchTableStack();
watchCanvas();
getCanvasPositions();