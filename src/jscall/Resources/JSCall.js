 /* 
 * JSCall.js - The JS side of the JSCall Gecko#/C# glue layer
 *
 * Authors: 
 *  Michael Hutchinson <m.j.hutchinson@gmail.com>
 *  
 * Copyright (C) 2005 Michael Hutchinson
 *
 * This sourcecode is licenced under The MIT License:
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit
 * persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
 
var JSCallFunctions;
var delimiter = unescape ("%ea");

function JSCallInit()
{
	JSCallFunctions = Array();
	
	if (document.getElementsByTagName("jscall").length == 0) {
		el = document.createElement("jscall");
		document.documentElement.appendChild(el);
	}
	
	if (document.getElementsByTagName("jscall").length != 1) {
		throw "Error: the document already contains a <jscall> element";
	}
	
	el = document.getElementsByTagName("jscall")[0];
	el.addEventListener( "DOMNodeInserted", JSCallHandler, false );
	
	//JSCallRegisterClrHandler("Redo", Redo);
}


//function Redo()
//{
//	alert("Yay!");
//}


function JSCallHandler(e) 
{
	if ( e.target.nodeName == "infunction" && e.target.nodeType == 1 ){	
		fn = e.target.attributes[0].value;
		returnTo = e.target.attributes[1].value;
		args = e.target.attributes[2].value.split(delimiter);
		
		try {
		if(JSCallFunctions[fn]) {
			f = JSCallFunctions[fn];
			result = f(args);
		}
		else {
			throw "JSCall: The '"+fn+"' function has not been registered";
		}
		
		
		if (returnTo.length  != 0) {
			JSCallPlaceClrCall(returnTo, "", new Array(result));
		}
		
		}
		catch(e) {
			alert(e)
		}
		e.target.parentNode.removeChild(e.target);
	}
}


function JSCallPlaceClrCall(fn, returnTo, args) {
	str = "JSCall" + delimiter + fn + delimiter + returnTo + delimiter;
	
	if (args && args.length > 0)
	{
		str += args.join(delimiter);
	}
	document.title= str;
	
}


function JSCallUnregisterClrHandler() {
	if(JSCallFunctions[n]) {
		delete JSCallFunctions[n];
	}
	else {
		throw "Function with that name not registered";
	} 
}


function JSCallRegisterClrHandler(n, fn) {
	if((typeof fn) != "function") {
		throw "The fn argument must be a function";
	}
	if(JSCallFunctions[n]) {
		throw "Function with that name already registered";
	}
	else {
		JSCallFunctions[n] = fn;
	} 
}
