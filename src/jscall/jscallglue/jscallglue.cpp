/* 
 * jscallglue.cpp - XPCOM DOM interop for communication between JavaScript and Mono/Gecko#
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
 
//FIXME: uses internal string functions, so have to define this in newer Mozillas
//But we can only migrate to nsStringAPI.h in FF1.5/Mozilla 1.7+
#define MOZILLA_INTERNAL_API

#include <gtkmozembed.h>
#include <gtkmozembed_internal.h>

#include <nsCOMPtr.h>
#include <nsString.h>
#include <nsIWebBrowser.h>
#include <nsIDOMWindow.h>
#include <nsIDOMDocument.h>
#include <nsIDOMElement.h>
#include <nsIDOMNode.h>
#include <nsIDOMNodeList.h>

#include <nsIDOMHTMLScriptElement.h>




extern "C"
{
  int PlaceFunctionCall(GtkMozEmbed *embed, const PRUnichar *call, const PRUnichar *returnto, const PRUnichar *args);
  int ExecuteScript(GtkMozEmbed *embed, const PRUnichar *script);
}


/*
 Gets the browser's IDomDocument.
*/
nsCOMPtr<nsIDOMDocument> GetIDOMDocument(GtkMozEmbed *embed)
{
    //Get browser
    nsCOMPtr<nsIWebBrowser> browser;
    gtk_moz_embed_get_nsIWebBrowser(embed, getter_AddRefs(browser));
    if(!browser) return NULL;
    
    nsCOMPtr<nsIDOMWindow> domWindow;
    browser->GetContentDOMWindow(getter_AddRefs(domWindow));

    nsCOMPtr<nsIDOMDocument> domDocument;
    domWindow->GetDocument(getter_AddRefs(domDocument));
    return domDocument;
}


/*
 Places a <outfunction call="..." args="..." returnto="..." />
 function call element in the <jscall> element.
*/
int PlaceFunctionCall(GtkMozEmbed *embed, const PRUnichar *call, const PRUnichar *returnto, const PRUnichar *args)
{
	nsresult result;
	
    nsCOMPtr<nsIDOMDocument> doc = GetIDOMDocument(embed);
    
    if(doc == NULL) return 1;
        
    //get the "jscall" node
    nsCOMPtr<nsIDOMNodeList> nodes;
    result = doc->GetElementsByTagName(NS_ConvertUTF8toUTF16("jscall"), getter_AddRefs(nodes));
    if(NS_FAILED(result) || !nodes) return 2;
    
    PRUint32 length = 0;
    result = nodes -> GetLength(&length);
    if(NS_FAILED(result)) return 3;
    if(length != 1) return 4;
    
    nsCOMPtr<nsIDOMNode> jscall;
    result = nodes->Item(0, getter_AddRefs(jscall));
    if(NS_FAILED(result) || !jscall) return 5;

    //add an "infunction" node
    nsCOMPtr<nsIDOMElement> infunction;
    result = doc->CreateElement(NS_ConvertUTF8toUTF16("infunction"), getter_AddRefs(infunction));
    if(NS_FAILED(result) || !infunction) return 6;
    
    //add the properties
    result = infunction->SetAttribute(NS_ConvertUTF8toUTF16("call"), nsDependentString(call));
    result = infunction->SetAttribute(NS_ConvertUTF8toUTF16("returnto"), nsDependentString(returnto));
    result = infunction->SetAttribute(NS_ConvertUTF8toUTF16("args"), nsDependentString(args));
    if(NS_FAILED(result)) return 7;
    
    //append it to the jscall node
    nsCOMPtr<nsIDOMNode> domNodeInfunction = do_QueryInterface(infunction);
    if(!domNodeInfunction) return 8;
    nsCOMPtr<nsIDOMNode> outchild;
    result = jscall->AppendChild(domNodeInfunction, getter_AddRefs(outchild));
    if(NS_FAILED(result) || !jscall) return 9;
    
    return 0;
}

// Inspiration from
// http://kmeleon.cvs.sourceforge.net/kmeleon/k-meleon/BrowserViewUtils.cpp?revision=1.53&view=markup
int ExecuteScript(GtkMozEmbed *embed, const PRUnichar *script)
{
    nsresult result;
    
    nsCOMPtr<nsIDOMDocument> doc = GetIDOMDocument(embed);
    
    if (doc == NULL)
        return 1;
    
    // Create the script node
    nsCOMPtr<nsIDOMElement> scriptDOMElement;
    result = doc->CreateElement(NS_ConvertUTF8toUTF16("script"), getter_AddRefs(scriptDOMElement));
    if (NS_FAILED(result) || !scriptDOMElement)
       return 2;
       
    // and the content
    nsCOMPtr<nsIDOMHTMLScriptElement> scriptE = do_QueryInterface(scriptDOMElement);
    if (!scriptE)
        return 3;

    scriptE->SetText(nsDependentString(script));
    scriptE->SetType(NS_ConvertUTF8toUTF16("text/javascript"));

    // find the body node.
    nsCOMPtr<nsIDOMElement> body;
    result = doc->GetDocumentElement(getter_AddRefs(body));
    if (NS_FAILED(result) || !body)
        return 4;

    // add the element to the body
    nsCOMPtr<nsIDOMNode> unused;
    result = body->AppendChild(scriptE, getter_AddRefs(unused));
    if (NS_FAILED(result))
        return 5;

    // gecko has executed the element, we can remove it now
    result = body->RemoveChild(scriptE, getter_AddRefs(unused));

    return 0;
}
