
var codePalyPath = "./codeEditor/";
/** MAKE SURE IMPORT CODEMIRROR FIRST **/

var codePlay = (function() {
    var isIE = (document.all) ? true: false;

    // TODO: Import CodeMirror

    var $ = function(id) {
        return document.getElementById(id);
    };

    var Extend = function(destination, source) {
        for (var property in source) {
            destination[property] = source[property];
        }
    }

    var Bind = function(object, fun, args) {
        return function() {
            return fun.apply(object, args || []);
        }
    }

    var BindAsEventListener = function(object, fun) {
        var args = Array.prototype.slice.call(arguments).slice(2);
        return function(event) {
            return fun.apply(object, [event || window.event].concat(args));
        }
    }

    var CurrentStyle = function(element) {
        return element.currentStyle || document.defaultView.getComputedStyle(element, null);
    }

    function create(elm, parent, fn) {
        var element = document.createElement(elm);
        fn && fn(element);
        parent && parent.appendChild(element);
        return element
    };
    function addListener(element, e, fn) {
        element.addEventListener ? element.addEventListener(e, fn, false) : element.attachEvent("on" + e, fn)
    };
    function removeListener(element, e, fn) {
        element.removeEventListener ? element.removeEventListener(e, fn, false) : element.detachEvent("on" + e, fn)
    };


    function tabSwitch(e, inst) {
        e.preventDefault();
        if(!this.parentNode.classList.contains("cur")) {
            var lastMode = inst.curMode;
            // Switch tab status
            var nodes = this.parentNode.parentNode.childNodes;
            var length = nodes.length;
            for(var i=0; i<length; i++) {
                nodes[i].classList.remove("cur");
                nodes[i].className = nodes[i].classList.toString();
            }
            this.parentNode.classList.add("cur");
            this.parentNode.className = this.parentNode.classList.toString();
            // Switch editor 
            inst.curMode = this.getAttribute("href").replace("#","");
            // Save data
            inst.data[lastMode] = inst.editor.getValue();
            inst.editor.setOption("mode", inst.modeMap[inst.curMode]);
            inst.editor.setValue(inst.data[inst.curMode]);
        }
        return false;
    }

    function reFontSize(e, args) {
        debugger;
        var delta = args[0];
        var inst = args[1];
        var obj = inst.editor.getWrapperElement().style;
        if(delta === 0) {
            // Rewind font size
            obj.fontSize = inst.codeFontSize;
        } else {
            var curFontSize = obj.fontSize.replace("px","");
            var newFontSize = Number(curFontSize) + delta;
            obj.fontSize = Number(curFontSize) ? newFontSize + "px" : inst.codeFontSize;
        }
        inst.editor.refresh();
    }

    var Class = function(properties) {
        var _class = function() {
            return (arguments[0] !== null && this.initialize && typeof(this.initialize) == 'function') ? this.initialize.apply(this, arguments) : this;
        };
        _class.prototype = properties;
        return _class;
    };

    var Dialog = new Class({
        options: {
            Width: 400,
            Height: 400,
            Left: 100,
            Top: 100,
            Titleheight: 26,
            Minwidth: 200,
            Minheight: 200,
            CancelIco: true,
            ResizeIco: true,
            Info: "标题",
            Zindex: 2,
            curMode: "html",
            modeMap: {
                "html": "htmlmixed",
                "css": "css"
            },
            status: "normal",
            data: {
                html: "<html>\n<head></head>\n<body>\n</body>\n</html>",
                css: "body { background-color:blue; }"
            },
            codeFontSize: "16px"
        },
        initialize: function(options) {
            this._dragobj = null;
            this._resize = null;
            this._cancel = null;
            this._body = null;
            this._x = 0;
            this._y = 0;
            this._fM = BindAsEventListener(this, this.Move);
            this._fS = Bind(this, this.Stop);
            this._isdrag = null;
            this._Css = null;
            //////////////////////////////////////////////////////////////////////////////// 
            this.status = this.options.status;
            this.Width = this.options.Width;
            this.Height = this.options.Height;
            this.Left = this.options.Left;
            this.Top = this.options.Top;
            this.CancelIco = this.options.CancelIco;
            this.Info = this.options.Info;
            this.Minwidth = this.options.Minwidth;
            this.Minheight = this.options.Minheight;
            this.Titleheight = this.options.Titleheight;
            this.Zindex = this.options.Zindex;
            this.curMode = this.options.curMode;
            this.modeMap = this.options.modeMap;
            this.data = this.options.data;
            this.codeFontSize = this.options.codeFontSize;
            Extend(this, options);
            Dialog.Zindex = this.Zindex;
            //////////////////////////////////////////////////////////////////////////////// 构造dialog 
            var obj = [
                    'dialog-container', 
                    'dialog-title', 
                    'code-side',
                    'preview-side', 
                    'dialog-body',
                    'dialog-footer'
            ];
            for (var i = 0; i < obj.length; i++) {
                obj[i] = create('div', null,
                function(elm) {
                    elm.className = obj[i];
                });
            }
            var tabs = [];
            var self = this;
            create("ul", obj[1], function(elm) {
                create("li", elm, function(el) {
                    if(self.curMode === "html") {
                        el.setAttribute("class", "cur");
                    }
                    create("a", el, function(e) {
                        e.setAttribute("class", "tabbtn cur");
                        e.setAttribute("href", "#html");
                        e.innerHTML = "HTML";
                        tabs.push(e);
                        addListener(e, "click", BindAsEventListener(e, tabSwitch, self));
                    });
                });
                create("li", elm, function(el) {
                    if(self.curMode === "css") {
                        el.setAttribute("class", "cur");
                    }
                    create("a", el, function(e) {
                        e.setAttribute("class", "tabbtn");
                        e.setAttribute("href", "#css");
                        e.innerHTML = "CSS";
                        tabs.push(e);
                        addListener(e, "click", BindAsEventListener(e, tabSwitch, self));
                    });
                });
            });
            var cnlobj = create("i", obj[1]);
            create("h3", obj[1]).innerHTML = this.Info;;
            
            var editor = create("textarea", obj[2], function(elm) {
                //elm.className = "cm_html curEditor";
            });
            create("div", obj[2], function(elm) {
                elm.setAttribute("class", "fontResizer");
                var fontPlus = create("b", elm, function(el) { el.innerHTML = "+"});
                var fontMinus = create("b", elm, function(el) { el.innerHTML = "-"});
                var fontNormal = create("b", elm, function(el) { el.innerHTML = "O"});
                addListener(fontPlus, "click", BindAsEventListener(fontPlus, reFontSize, [2, self]));
                addListener(fontMinus, "click", BindAsEventListener(fontMinus, reFontSize, [-2, self]));
                addListener(fontNormal, "click", BindAsEventListener(fontNormal, reFontSize, [0, self]));
            })
            /*
            var cm_css = create("textarea", obj[2], function(elm) {
                elm.className = "cm_css";
            }) */
            var previewFrame = create("iframe", obj[3], function(elm) {
                //TODO:
            });

            obj[0].appendChild(obj[1]);
            obj[4].appendChild(obj[2]);
            obj[4].appendChild(obj[3]);
            obj[0].appendChild(obj[4]);
            obj[0].appendChild(obj[5]);

            document.body.appendChild(obj[0]);
            this._title = obj[1];
            this._dragobj = obj[0];
            this._resize = obj[5];
            this._cancel = cnlobj;
            this._body = obj[4];
            this.editor = new CodeMirror.fromTextArea(editor, {
                tabSize: 4,
                indentUnit: 4,
                smartIndent: true,
                lineNumbers: true,
                mode: this.modeMap[this.curMode],
                onChange: BindAsEventListener(this, this.preview)
            }); 
            this.previewFrame = previewFrame;
            this.editor.setValue(this.data[this.curMode]);
            this.editor.getWrapperElement().style.fontSize = this.codeFontSize;

            ////////////////////////////////////////////////////////////////////////////////o,x1,x2 
            ////设置Dialog的长 宽 ,left ,top 
            this._dragobj.style.height = this.Height + "px";
            this._dragobj.style.top = this.Top + "px";
            this._dragobj.style.width = this.Width + "px";
            this._dragobj.style.left = this.Left + "px";
            this._dragobj.style.zIndex = this.Zindex;

            this._body.style.height = this.Height - this.Titleheight - parseInt(CurrentStyle(this._body).paddingLeft) * 2 + 'px';
            this.ResizeBody(this._body.clientHeight);
            /////////////////////////////////////////////////////////////////////////////// 添加事件 
            addListener(this._dragobj, 'mousedown', BindAsEventListener(this, this.Start, true));
            addListener(this._cancel, 'mouseover', Bind(this, this.Changebg, [this._cancel, '0px 0px', '-21px 0px']));
            addListener(this._cancel, 'mouseout', Bind(this, this.Changebg, [this._cancel, '0px 0px', '-21px 0px']));
            addListener(this._cancel, 'click', BindAsEventListener(this, this.Disappear));
            addListener(this._body, 'mousedown', BindAsEventListener(this, this.Cancelbubble));
            addListener(this._resize, 'mousedown', BindAsEventListener(this, this.Start, false));
            addListener(this._title, 'dblclick', BindAsEventListener(this, this.toggleFullScreen));
        },
        Disappear: function(e) {
            this.Cancelbubble(e);
            document.body.removeChild(this._dragobj);
        },
        Cancelbubble: function(e) {
            this._dragobj.style.zIndex = ++Dialog.Zindex;
            document.all ? (e.cancelBubble = true) : (e.stopPropagation())
        },
        Changebg: function(o, x1, x2) {
            o.style.backgroundPosition = (o.style.backgroundPosition == x1) ? x2: x1;
        },
        Start: function(e, isdrag) {
            if (!isdrag) {
                this.Cancelbubble(e);
            }
            this._Css = isdrag ? {
                x: "left",
                y: "top"
            }: {
                x: "width",
                y: "height"
            }
            this._dragobj.style.zIndex = ++Dialog.Zindex;
            this._isdrag = isdrag;
            this._x = isdrag ? (e.clientX - this._dragobj.offsetLeft || 0) : (this._dragobj.offsetLeft || 0);
            this._y = isdrag ? (e.clientY - this._dragobj.offsetTop || 0) : (this._dragobj.offsetTop || 0);
            if (isIE) {
                addListener(this._dragobj, "losecapture", this._fS);
                this._dragobj.setCapture();
            } else {
                e.preventDefault();
                addListener(window, "blur", this._fS);
            }
            addListener(document, 'mousemove', this._fM);
            addListener(document, 'mouseup', this._fS);
        },
        Move: function(e) {
            window.getSelection ? window.getSelection().removeAllRanges() : document.selection.empty();
            var i_x = e.clientX - this._x,
            i_y = e.clientY - this._y;
            this._dragobj.style[this._Css.x] = (this._isdrag ? Math.max(i_x, 0) : Math.max(i_x, this.Minwidth)) + 'px';
            this._dragobj.style[this._Css.y] = (this._isdrag ? Math.max(i_y, 0) : Math.max(i_y, this.Minheight)) + 'px'
            if (!this._isdrag) {
                var newHeight =  Math.max(i_y - this.Titleheight, this.Minheight - this.Titleheight) - 2 * parseInt(CurrentStyle(this._body).paddingLeft);
                this._body.style.height = newHeight + 'px';
                this.ResizeBody();
            }
        },
        Stop: function() {
            removeListener(document, 'mousemove', this._fM);
            removeListener(document, 'mouseup', this._fS);
            if (isIE) {
                removeListener(this._dragobj, "losecapture", this._fS);
                this._dragobj.releaseCapture();
            } else {
                removeListener(window, "blur", this._fS);
            };
        },
        ResizeBody: function() {

            // Editor height
            var newHeight= this._body.clientHeight;
            /*
            this.editor.html.getWrapperElement().childNodes[2].style.height = (newHeight - 15) + "px";
            this.editor.css.getWrapperElement().childNodes[2].style.height = (newHeight - 15) + "px";
             */
            this.editor.getWrapperElement().childNodes[2].style.height = (newHeight - 20) + "px";
            // Preview height
            // 
            this.previewFrame.style.height = (newHeight - 23) + "px";
        },
        toggleFullScreen: function() {
            debugger;
            if(this.status === "fullscreen") {
                this._dragobj.style.height = this.last_height;
                this._dragobj.style.width = this.last_width;
                this._dragobj.style.top = this.last_top;
                this._dragobj.style.left = this.last_left;
                this._body.style.height = this.last_bodyHeight;

                this.status = "normal";

            } else {
                this.last_height = this._dragobj.style.height;
                this.last_width = this._dragobj.style.width;
                this.last_top = this._dragobj.style.top;
                this.last_left = this._dragobj.style.left;
                this.last_bodyHeight = this._body.style.height;

                this._dragobj.style.top = 0;
                this._dragobj.style.left = 0;
                this._dragobj.style.width = (event.view.innerWidth - 5) + "px";
                this._dragobj.style.height = (event.view.innerHeight - 5) + "px"

                this._body.style.height = (event.view.innerHeight - 5) - this.Titleheight - parseInt(CurrentStyle(this._body).paddingLeft) * 2 + 'px';

                this.status = "fullscreen";
            }
            this.ResizeBody();
        },
        preview: function() {
            var self = this;
            self.data[this.curMode] = self.editor.getValue();
            var frameDoc = self.previewFrame.contentDocument;
            //frameDoc.all[0].innerHTML = self.data.html.replace(/<\/?html>/g, "")
            frameDoc.open();
            frameDoc.write(self.data.html);
            frameDoc.head.appendChild(create("style", null, function(elm) {
                elm.setAttribute("type", "text/css");
                elm.innerHTML = self.data.css;
            }));
            frameDoc.close();
        }
    });

    return Dialog;
})();