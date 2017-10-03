/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   client.js                                          :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: anonymous <anonymous@student.42.fr>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2017/09/29 10:43:49 by anonymous         #+#    #+#             */
/*   Updated: 2017/10/03 10:12:35 by anonymous        ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */
// trigger extension
const { remote } = require('electron');
const { dialog, Menu } = remote;
const fs = require('fs');
const jschardet = require('jschardet');

const suggest = new Suggest.LocalMulti("console", "suggest", [], {})

const lang = require('lang-detector')

var oldTabs = JSON.parse(localStorage.getItem('tabs'));

var Commands = {
    echo: function(...arg) {
        for (var key in arg) {
            sendConsole(arg[key])
        }
    },
    ls: function() {
        new Promise((resolve) => {
            var filename = pathToName(CurrentEditer.path)
            var dict = CurrentEditer.path.slice(0, -filename.length) || "./"
            fs.readdir(dict, (err, files) => {
                var str = "ディレクトリ : " + dict + "\n\n"
                str += files.map((file) => {
                    if (fs.statSync(dict + file).isDirectory()) {
                        return `[${file}]`
                    } else {
                        return file;
                    }
                }).map((f, i) => {
                    if (i % 5 < 4) {
                        return f + '    ';
                    } else {
                        return f + '\n';
                    }
                }).join('')
                sendConsole(str)
            })
        })
    },
    open: function(arg) {
        var filename = pathToName(CurrentEditer.path)
        var dict = CurrentEditer.path.slice(0, -filename.length) || "./"
        fs.readdir(dict, (err, files) => {
            var files = files.filter((file) => {
                return file.indexOf(arg) == 0 && !fs.statSync(dict + file).isDirectory()
            })
            if (files.length == 0) {
                sendConsole(arg + " が見つかりません")
                return;
            }
            if (files.length == 1) {
                openFile(dict + files[0])
                    .then((data) => {
                        toggleCommandConsole();
                        if (CurrentEditer.session.$undoManager.dirtyCounter !== 0 || CurrentEditer.path !== "") {
                            CurrentEditer = CreateNewEditter();
                            // toggleCommandConsole();
                        }
                        CurrentEditer.setValue(data);
                        CurrentEditer.path = dict + files[0];
                        sendConsole("Open " + CurrentEditer.path)
                        setTitle()
                    }).catch((e) => {
                        if (e == 0) { return }
                        console.log(e)
                        alert('ファイルが開けません');
                    });;
                return;
            }
            var str = "";
            files.forEach((file) => {
                str += file + " "
            })
            str += "が見つかりました。"
            sendConsole(str)
        })
    },
    "debug": function() {
        remote.getCurrentWindow().toggleDevTools();
    },
    "save": function() {
        saveFile(CurrentEditer.path)
    }
}

ace.require("ace/ext/language_tools");

var editor = ace.edit("editor0");

editor.session.setMode("ace/mode/javascript");
editor.setTheme("ace/theme/tomorrow");
// enable autocompletion and snippets
editor.setOptions({
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: false
});

editor.$blockScrolling = Infinity;
editor.path = "";
editor.index = 0;

var VirtualTab = [];
registShortcut(editor)
VirtualTab.push(editor);

var CurrentEditer = VirtualTab[0]
var menu = [{
        label: "ファイル(F)",
        submenu: [
            { label: "新規" },
            {
                label: "開く",
                click() {
                    dialog.showOpenDialog(null, {}, function(path) {
                        if (path.length == 0) { return }
                        openFile(path)
                            .then((data) => {
                                if (CurrentEditer.session.$undoManager.dirtyCounter !== 0 || CurrentEditer.path !== "") {
                                    CurrentEditer = CreateNewEditter();
                                }
                                CurrentEditer.setValue(data);
                                CurrentEditer.path = path[0];
                                setTitle()
                            }).catch((e) => {
                                if (e == 0) { return }
                                console.log(e)
                                alert('ファイルが開けません');
                            });
                    })
                }
            },
            {
                label: "上書き保存",
                click() {
                    saveFile(CurrentEditer.path);
                }
            },
            {
                label: "名前を付けて保存",
                click() {
                    saveFile();
                }
            },
            { type: 'separator' },
            { label: "ページ設定" },
            { label: "印刷" },
            { type: 'separator' },
            { label: "メモ帳の終了" },
        ]
    },
    {
        label: "編集(E)",
        submenu: [{
                label: "元に戻す",
                accelerator: "Ctrl+Z",
                click() {
                    console.log("test")
                }
            },
            { type: 'separator' },
            { label: "コピー" },
            { label: "貼り付け" },
            { label: "削除" },
            { type: 'separator' },
            { label: "検索" }
        ]
    }, {
        label: "書式(O)",
        submenu: [
            { label: "右側で折り返す" }
        ]
    }, {
        label: "表示(V)",
        submenu: [
            { label: "ステータス バー" }
        ]
    }, {
        label: "ヘルプ(H)",
        submenu: [
            { label: "ヘルプの表示" }
        ]
    }
]
Menu.setApplicationMenu(Menu.buildFromTemplate(menu))

remote.getCurrentWindow().on('close',()=>{
    saveTabs();
});
remote.getCurrentWindow().toggleDevTools();

oldTabs && oldTabs.forEach((tabs) => {
    if (tabs.isFile) {
        var path = tabs.path;
        openFile(path)
            .then((data) => {
                if (CurrentEditer.session.$undoManager.dirtyCounter !== 0 || CurrentEditer.path !== "") {
                    CurrentEditer = CreateNewEditter();
                }
                CurrentEditer.setValue(data);
                CurrentEditer.path = path;
                setTitle()
            }).catch((e) => {
                if (e == 0) { return }
                console.log(e)
                alert('ファイルが開けません');
            });
    }else{
        CurrentEditer = CreateNewEditter();
        CurrentEditer.setValue(tabs.data);
    }
});

function saveTabs() {
    var arr = [];
    VirtualTab.forEach(tab=>{
        if(!("path" in tab) || tab.path==""){
            if(tab.getValue()===""){return;}
            arr.push({
                isFile:false,
                data:tab.getValue()
            })
        }else{
            if(tab.session.$undoManager.dirtyCounter>1){
                if(confirm(`${pathToName(tab.path)} を保存しますか?`)){
                    saveFile(tab.path);
                }else{
                    return;
                }
            }
            arr.push({
                isFile:true,
                path:tab.path
            })
        }
    })
    localStorage.setItem('tabs',JSON.stringify(arr));
}


function registShortcut(editer) {
    editer.commands.addCommand({
        name: "viewCommandConsole",
        bindKey: { win: "Ctrl-P" },
        exec(editor) {
            toggleCommandConsole();
        }
    })

    editer.commands.addCommand({
        name: "nextTab",
        bindKey: { win: "Ctrl-W" },
        exec(editor) {
            setCurrentTab(VirtualTab[(editer.index + 1 + VirtualTab.length) % VirtualTab.length]);
        }
    })

    editer.commands.addCommand({
        name: "previousTab",
        bindKey: { win: "Ctrl-Q" },
        exec(editor) {
            setCurrentTab(VirtualTab[(editer.index - 1 + VirtualTab.length) % VirtualTab.length]);
        }
    })
    editer.commands.addCommand({
        name: "save",
        bindKey: { win: "Ctrl-S" },
        exec() {
            saveFile(CurrentEditer.path)
        }
    })
}

document.getElementById('console').addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'Enter':
            evalCommand(e.target.value);
            e.target.value = "";
            break;
        case 'Escape':
            toggleCommandConsole();
            break;
        case 'p':
            if (e.ctrlKey) {
                toggleCommandConsole();
            }
            break;
    }
})

function saveFile(path) {
    if (!path) {
        dialog.showSaveDialog(null, {
            title: '保存'
        }, (files) => {
            if (!files) { return; }
            saveFile(files)
        })
    } else {
        fs.writeFile(path, CurrentEditer.getValue(), (err) => { console.log(err) });
    }
}

function CreateNewEditter() {

    var editers = document.getElementById('Editor');

    for (var i = 0; i < editers.childNodes.length; i++) {
        if (editers.childNodes[i].tagName !== "PRE") { continue }
        editers.childNodes[i].style.display = "none"
    }

    var node = document.createElement('pre');
    node.id = "editor" + VirtualTab.length
    node.class = "editor"
    node.style.position = "absolute"
    node.classList.add('editor')
    editers.appendChild(node)

    var editor = ace.edit(node.id);

    editor.session.setMode("ace/mode/javascript");
    editor.setTheme("ace/theme/tomorrow");
    // enable autocompletion and snippets
    editor.setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true,
        enableLiveAutocompletion: false
    });

    editor.$blockScrolling = Infinity;
    editor.path = "";
    editor.index = VirtualTab.length;
    registShortcut(editor)
    editor.focus();
    VirtualTab.push(editor);

    return editor;
}

function openFile(fileNames) {
    if (Array.isArray(fileNames)) {
        if (fileNames.length == 0) {
            return;
        }
        var file = fileNames[0];
    } else {
        var file = fileNames;
    }
    return new Promise((resolve, {}, reject) => {
        fs.readFile(file, (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            var charCode = jschardet.detect(data);
            var l = lang(data.toString(charCode.encoding)).toLocaleLowerCase()
            switch (l) {
                case 'c':
                case 'cpp':
                    l = "c_cpp";
            }
            CurrentEditer.session.setMode("ace/mode/" + l)
            resolve(data.toString(charCode.encoding));
        });
    })
}
//177 49
function toggleCommandConsole() {
    var CommandElem = document.getElementById("Command");

    if (CommandElem.style.display === "none") {
        CommandElem.style.display = "";
        CurrentEditer.container.classList.remove('editor');
        CurrentEditer.container.classList.add('editor_command')
        CurrentEditer.blur();
        document.getElementById('console').focus();
    } else {
        CommandElem.style.display = "none";
        CurrentEditer.container.classList.remove('editor_command');
        CurrentEditer.container.classList.add('editor')
        CurrentEditer.focus();
    }
}


function evalCommand(command) {
    for (var key in Commands) {
        eval(`var ${key} = ${Commands[key]}`);
    }
    command.split(';').forEach((com) => {
        try {
            var arr = com.split(" ");
            var exec = arr.shift();
            var args = arr.map((str) => {
                return isNaN(str) ? `"${str}"` : eval(str);
            })
            eval(`${exec}(${args.join(',')})`)
        } catch (e) {
            sendConsole(e.toString())
        }
    })
    sendConsole(">>" + command)
}

function setCurrentTab(editer) {
    var editers = document.getElementById("Editor");
    VirtualTab.forEach((e) => {
        e.container.style.display = "none"
    })
    editer.container.style.display = "";
    CurrentEditer.blur();
    CurrentEditer = editer;
    CurrentEditer.focus();
    setTitle();
}

function sendConsole(text) {
    var elem = document.getElementById("stdout");
    elem.innerText = text + "\n" + elem.innerText;
}

function setTitle() {
    var str = "すごいメモ帳 - ";
    VirtualTab.forEach((editor) => {
        var file = editor.path ? pathToName(editor.path) : "無題"
        var addstr = file;
        if (CurrentEditer.index == editor.index) {
            addstr = `<<${file}>>`
        }
        str += addstr + " "
    })
    document.title = str;
}


function pathToName(path) {
    var arr = path.replace(/\//g, "\\").split('\\');
    return arr[arr.length - 1]
}