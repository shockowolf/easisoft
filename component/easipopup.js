(function ($) {
	//easiPopup 컴포넌트 정의 시작(앞에 _가 붙은 함수들은 모두 내부에서만 사용하는 변수 및 함수임)
	$.fn.easiPopup = function(params){
		function EasiPopup(options){
			this.options = options;
		}
		console.log(params);
		//easiPopup 초기화
		EasiPopup.prototype._init = function($element){
			$element.addClass("easi-popup");
			this._$element = $element;
			
			//옵션으로 받은 모드 구분에 따라 나누어 처리
			console.log(this.options);
			if(this.options.mode == "button"){
				this._initButtonType($element);
			}else if(this.options.mode == "single"){
				this._initSingleType($element);
			}else if(this.options.mode == "multiple"){
				this._initMultipleType($element);
			}
			if(this.options.onContentReady){
				this.options.onContentReady({
					component:this,
					value:this.options.value
				});
			}
			window[this.options.instanceName] = this;
		};
		
		EasiPopup.prototype._entrySet = new Set(); //key목록을 저장하기 위한 변수
		
		EasiPopup.prototype.getEntrySet = function(){
			return this._entrySet;
		};
		
		//서버에서 ModelAttribute로 파라미터를 array를 전송할때 key[index][key] = value 형태로 넘어가서 에러가 나는것을 방지하기 위해 key[index].key = value 형태로 변환해주는 함수
		function generateSpringListString(data, resultData, keyPrefix){
			if(!resultData){
				resultData = new Object();
			}
			if(!keyPrefix){
				keyPrefix = "";
			}
			$.each(data, function(key, value){
				var isArray = $.isArray(value);
				if(isArray){
					for(var i=0;i<value.length;i++){
						if(typeof value[i] == "object" && (value[i] && value[i].constructor.name !== "File")){
							$.each(value[i], function(childKey, childValue){
								if(typeof childValue != "undefined" && childValue != null){
									if($.isArray(childValue)){
										var subObject = new Object();
										subObject[childKey] = childValue;
										childValue = $.generateSpringListString(subObject, new Object(), key + "[" + i + "].");
										$.extend(resultData, childValue);
									}else{
										resultData[keyPrefix + key + "[" + i + "]." + childKey] = childValue;
									}
								}
							})
						}else{
							resultData[keyPrefix + key + "[" + i + "]"] = value[i];
						}
					}
				}else if(value && typeof value == "object" && Object.getPrototypeOf(value).constructor.name === ({}).constructor.name){
					if(value && value.constructor.name !== "File"){
						$.each(value, function(childKey, childValue){
							if(typeof childValue != "undefined" && childValue != null){
								if($.isArray(childValue)){
									var subObject = new Object();
									subObject[childKey] = childValue;
									childValue = $.generateSpringListString(subObject, new Object(), key + ".");
									$.extend(resultData, childValue);
								}else{
									resultData[keyPrefix + key + "." + childKey] = childValue;
								}
							}
						})
					}else{
						resultData[keyPrefix + key] = value;
					}
				}else{
					if(typeof value != "undefined" && value != null){
						resultData[key] = value;
					}
				}
			});
			return resultData;
		}
		
		//팝업열기
		function openPopup(_this){
			//팝업을 화면의 가운데 띄우기 위해 계산
			var screenWidth = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
			var screenHeight = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
			/*var screenWidth = window.screen.availLeft != undefined ? window.screen.availWidth : window.screen.width;
			var screenHeight = window.screen.availTop != undefined ? window.screen.availHeight : window.screen.height;*/
		    var width = _this.options.popupWidth;
			var height = _this.options.popupHeight;
			
			var popupOption = "";
			//width와 height가 %일 경우와 숫자일 경우의 계산
			if(width){
				if(typeof width == "string"){
					if(width.indexOf("%") > -1){
						width = screenWidth * Number(width.replace("%", ""))/100;
					}else{
						width = Number(width.replace(/[^0-9]/g, ""));
					}
				}
				var left = window.screenLeft + (screenWidth/2) - (width/2);
				popupOption += ",width="+width+", left="+left;
			}
			if(height){
				if(typeof height == "string"){
					if(height.indexOf("%") > -1){
						height = screenHeight * Number(height.replace("%", ""))/100;
					}else{
						height = Number(height.replace(/[^0-9]/g, ""));
					}
				}
				var top = window.screenTop + (screenHeight/2) - (height/2);
				popupOption += ", height="+height+", top="+top;
			}
			
			//입력받은 파라미터를 post방식으로 팝업에 전송하기 위해서 form을 생성하여 submit
			var url = _this.options.url;
			var form = document.createElement("form");
			form.method = "post";
			form.action = url;
			form.target = _this.options.popupName; //옵션으로 받은 팝업이름
			
			if(_this.options.data){
				var data = generateSpringListString(_this.options.data);
				$.each(data, function(key, value){
					var input = document.createElement("input");
					input.type = "hidden";
					input.name = key;
					input.value = value;
					form.appendChild(input);
				});
			}
			//옵션으로 받은 객체변수 이름(팝업에서 easiPopup객체를 참조하기 위해 사용)
			var input = document.createElement("input");
			input.type = "hidden";
			input.name = "instance";
			input.value = _this.options.instanceName;
			form.appendChild(input);
			
			var popup = window.open("", _this.options.popupName, "location=no, menubar=no, status=no, toolbar=no"+popupOption);
			if(popup){
				document.body.appendChild(form);
				form.submit();
				form.parentNode.removeChild(form);
				popup.focus();
			}
		}
		
		//버튼타입(선택한 리스트나 input이 보이지 않음)
		EasiPopup.prototype._initButtonType = function($element){
			var _this = this;
			$element.addClass("type-button");
			
			if(_this.options.disabled){
				$element.addClass("disabled");
				return;
			}
			
			//beforePopup 콜백 호출한 뒤 리턴이 false가 아니면 팝업 오픈
			$element.on("click", function(){
				if(_this.options.onBeforePopup){
					var result = _this.options.onBeforePopup({
						component:_this,
						data:_this.options.data
					});
					if(result === false){
						return;
					}
				}
				openPopup(_this);
			});
		};
		
		//single타입(선택한 항목이 input에 표시됨)
		EasiPopup.prototype._initSingleType = function($element){
			var _this = this;
			$element.addClass("type-single");
			
			var $innerWrap = $("<div class='easi-popup-inner'>");
			var $inputBox = $("<input type='text' class='easi-popup-input' readonly>");
			var $removeBtn = $("<button type='button' class='easi-popup-remove-btn'><i class='far fa-times'></i></button>");
			var $findBtn = $("<button type='button' class='easi-popup-open-btn'><i class='fal fa-search'></i></button>");
			
			$innerWrap.append($inputBox);
			if(!_this.options.disabled){
				$innerWrap.append($removeBtn);
				$innerWrap.append($findBtn);
			}
			if(_this.options.value.length > 0){
				$inputBox.val(_this.options.value[0][_this.options.displayExpr]);
				$removeBtn.addClass("show");
			}
			$element.empty();
			$element.append($innerWrap);
			
			if(_this.options.disabled){
				$element.addClass("disabled");
				return;
			}
			
			//삭제버튼을 눌렀을때 값을 keySet에서 삭제
			$removeBtn.on("click", function(){
				_this.removeValueByKey(_this.getKeySet(_this.options.value[0]));
			});
			
			//beforePopup 콜백 호출한 뒤 리턴이 false가 아니면 팝업 오픈
			$findBtn.on("click", function(){
				if(_this.options.onBeforePopup){
					var result = _this.options.onBeforePopup({
						component:_this,
						data:_this.options.data
					});
					if(result === false){
						return;
					}
				}
				openPopup(_this);
			});
		};
		
		//multiple 타입(선택한 항목이 리스트에 추가됨)
		EasiPopup.prototype._initMultipleType = function($element){
			var _this = this;
			$element.addClass("type-multiple");
			
			var $innerWrap = $("<div class='easi-popup-inner'>");
			var $titleWrap = $("<div class='easi-popup-title-wrap'>");
			var $title = $("<div class='easi-popup-title'>"+_this.options.title+"</div>");
			var $findBtn = $("<button type='button' class='easi-popup-open-btn'><i class='fal fa-plus'></i></button>");
			var $list = $("<div class='easi-popup-list'>");
			
			if(_this.options.showTitle){
				$titleWrap.append($title);
				$innerWrap.append($titleWrap);
			}
			$innerWrap.append($list);
			
			//옵션으로 초기 입력받은 value값을 세팅
			for(var i=0;i<_this.options.value.length;i++){
				_this._createListItem($list, _this.options.value[i], i);
			}
			
			//sorting옵션이 true일 경우 선택된 리스트의 순서를 변경할수 있게 함.
			if(_this.options.sorting && !_this.options.disabled){
				$list.sortable({
					handle:".easi-popup-item-sort-handler",
					stop:function(e, ui){
						var array = $list.sortable("toArray", {attribute:"data-order"});
						for(var i=0;i<array.length;i++){
							_this.options.value[parseInt(array[i])-1].__tempOrder__ = i+1;
						}
						_this.options.value.sort(function(a, b){
							return a.__tempOrder__ - b.__tempOrder__;
						});
						for(var i=0;i<_this.options.value.length;i++){
							$list.find(".easi-popup-item").eq(i).attr("data-order", i+1);
						}
						if(_this.options.onValueSorted){
							_this.options.onValueSorted({
								component:_this,
								value:_this.options.value,
								$items:_this._$element.find(".easi-popup-item-content-inner")
							});
						}
					}
				});
			}
			
			$element.empty();
			$element.append($innerWrap);
			
			if(_this.options.disabled){
				$element.addClass("disabled");
				return;
			}
			
			$titleWrap.append($findBtn);
			
			//beforePopup 콜백 호출한 뒤 리턴이 false가 아니면 팝업 오픈
			$findBtn.on("click", function(){
				if(_this.options.onBeforePopup){
					var result = _this.options.onBeforePopup({
						component:_this,
						data:_this.options.data
					});
					if(result === false){
						return;
					}
				}
				openPopup(_this);
			});
		};
		
		//multiple타입일 경우 선택된 value의 리스트를 화면에 그려줌
		EasiPopup.prototype._createListItem = function($list, value, i){
			var _this = this;
			var $item = $("<div class='easi-popup-item' data-order='"+(i+1)+"'>");
			var $itemSortHandler = $("<div class='easi-popup-item-sort-handler'><i class='fad fa-sort-alt'></i></div>");
			var $itemContent = $("<div class='easi-popup-item-content'>");
			var $itemContentInner = $("<div class='easi-popup-item-content-inner'>"+value[_this.options.displayExpr]+"</div>");
			var $itemRemoveBtn = $("<button type='button' class='easi-popup-item-remove-btn'><i class='far fa-times'></i></button>");
			
			//onItemCreating 콜백이 있으면 실행
			if(_this.options.onItemCreating){
				$itemContentInner = _this.options.onItemCreating({
					component:_this,
					value:_this.options.value,
					eventValue:value,
					index:i,
					$element:$itemContentInner
				});
			}
			
			//sorting옵션이 true일 경우 sorting시 마우스로 드래그 할 영역을 추가
			if(_this.options.sorting && !_this.options.disabled){
				$item.append($itemSortHandler);
			}
			$item.append($itemContent);
			if($itemContentInner){
				$itemContent.append($itemContentInner);
			}
			if(!_this.options.disabled){
				$item.append($itemRemoveBtn);
				//삭제 버튼을 클릭시 keySet에서 해당 value를 제거
				$itemRemoveBtn.on("click", function(){
					_this.removeValueByKey(_this.getKeySet(value));
				});
			}
			$list.append($item);
		};
		
		//value를 추가
		EasiPopup.prototype.putValue = function(value){
			var _this = this;
			if(value.constructor.name === ({}).constructor.name){
				value = [value];
			}
			
			//value는 array형태로 저장되는데 옵션으로 받은 값이 array가 아닌 경우 빈 array로 세팅
			if(!Array.isArray(value)){
				value = [];
			}
			
			for(var i=0;i<value.length;i++){
				if(value[i] === undefined && value[i] === null && value[i].constructor.name !== ({}).constructor.name){
					value = [];
					break;
				}
			}
			
			var eventValue = [];
			var isChanged = false;
			if(_this.options.mode == "multiple"){
				//duplication옵션이 true일 경우 중복을 허용하고 별도의 중복체크를 하지 않고 value를 추가
				if(_this.options.duplication){
					isChanged = true;
					for(var i=0;i<value.length;i++){
						_this.options.value.push(value[i]);
						eventValue.push($.extend(true, {}, value[i]));
						_this._createListItem(_this._$element.find(".easi-popup-list"), value[i], _this.getIndexByKey(_this.getKeySet(value[i])));
					}
				//duplication옵션이 false일 경우 중복을 허용하지 않음.
				}else{
					for(var i=0;i<value.length;i++){
						var keyData = this.getKeySet(value[i]);
						if(!_this._entrySet.has(keyData)){
							isChanged = true;
							_this._entrySet.add(keyData);
							_this.options.value.push(value[i]);
							eventValue.push($.extend(true, {}, value[i]));
							_this._createListItem(_this._$element.find(".easi-popup-list"), value[i], _this.getIndexByKey(_this.getKeySet(value[i])));
						}
					}
				}
			}else if(_this.options.mode == "button"){
				//duplication옵션이 true일 경우 중복을 허용하고 별도의 중복체크를 하지 않고 value를 추가
				if(_this.options.duplication){
					isChanged = true
					for(var i=0;i<value.length;i++){
						_this.options.value.push(value[i]);
						eventValue.push($.extend(true, {}, value[i]));
					}
				//duplication옵션이 false일 경우 중복을 허용하지 않음.
				}else{
					for(var i=0;i<value.length;i++){
						var keyData = this.getKeySet(value[i]);
						if(!_this._entrySet.has(keyData)){
							isChanged = true;
							_this._entrySet.add(keyData);
							_this.options.value.push(value[i]);
							eventValue.push($.extend(true, {}, value[i]));
						}
					}
				}
			}else if(_this.options.mode =="single"){
				//single모드인 경우 값이 추가될때마다 기존 값을 제거하고 새로 추가된 값만 남김
				var beforeKey = _this.options.value.length > 0 ? _this.options.value[0][_this.options.keyExpr] : undefined;
				_this._entrySet.clear();
				_this.options.value.length = 0;
				if(value.length > 0){
					_this._entrySet.add(_this.getKeySet(value[0]));
					_this.options.value.push(Object.assign({}, value[0]));
					eventValue.push(value[0]);
					_this._$element.find(".easi-popup-input").val(value[0][_this.options.displayExpr]);
					_this._$element.find(".easi-popup-remove-btn").addClass("show");
				}
				var afterKey = _this.options.value.length > 0 ? _this.options.value[0][_this.options.keyExpr] : undefined;
				if(beforeKey != afterKey){
					isChanged = true;
				}
			}
			//값이 변경되었을 경우 onValueChanged콜백을 호출
			if(_this.options.onValueChanged && isChanged){
				_this.options.onValueChanged({
					component:_this,
					value:$.extend([], _this.options.value),
					eventType:"add",
					eventValue:eventValue
				});
			}
		};
		
		//key값을 받아서 해당 value의 index를 리턴
		EasiPopup.prototype.getIndexByKey = function(key){
			var _this = this;
			return this.options.value.indexOf(this.options.value.find(function(obj){
				return _this.getKeySet(obj) == (Array.isArray(key) ? JSON.stringify(key) : key);
			}));
		};
		
		//index값을 받아서 해당 value의 key를 리턴
		EasiPopup.prototype.getKeyByIndex = function(index){
			if(this.options.value.length >= index){
				return this.getKeySet(this.options.value[index]);
			}
		};
		
		//index값을 받아서 해당 value를 리턴
		EasiPopup.prototype.getValueByIndex = function(index){
			if(this.options.value.length > index){
				return this.options.value[index][this.options.keyExpr];
			}
		};
		
		//key값을 받아서 해당 value를 value목록에서 제거
		EasiPopup.prototype.removeValueByKey = function(key){
			var index = this.getIndexByKey(key);
			var hasEntry = this._entrySet.has(typeof key == "string" ? key : JSON.stringify(key));
			this._entrySet.delete(typeof key == "string" ? key : JSON.stringify(key));
			var eventValue = this.options.value.splice(index, 1);
			
			if(this.options.mode == "single"){
				this._$element.find(".easi-popup-input").val("");
				this._$element.find(".easi-popup-remove-btn").removeClass("show");
			}else if(this.options.mode == "multiple"){
				this._$element.find(".easi-popup-item").eq(index).remove();
				this._$element.find(".easi-popup-item").each(function(i, elem){
					$(elem).attr("data-order", i+1);
				});
			}
			//값이 변경되었으므로 onValueChanged콜백 호출
			if(this.options.onValueChanged && hasEntry){
				this.options.onValueChanged({
					component:this,
					value:$.extend([], this.options.value),
					eventType:"remove",
					eventValue:eventValue
				});
			}
		};
		
		//index를 받아서 해당 value를 value목록에서 제거
		EasiPopup.prototype.removeValueByIndex = function(index){
			var key = this.getKeySet(this.options.value[index]);
			var hasEntry = this._entrySet.has(key);
			this._entrySet.delete(key);
			var eventValue = this.options.value.splice(index, 1);
			
			if(this.options.mode == "single"){
				this._$element.find(".easi-popup-input").val("");
				this._$element.find(".easi-popup-remove-btn").removeClass("show");
			}else if(this.options.mode == "multiple"){
				this._$element.find(".easi-popup-item").eq(index).remove();
				this._$element.find(".easi-popup-item").each(function(i, elem){
					$(elem).attr("data-order", i+1);
				});
			}
			//값이 변경되었으므로 onValueChanged콜백 호출
			if(this.options.onValueChanged && hasEntry){
				this.options.onValueChanged({
					component:this,
					value:$.extend([], this.options.value),
					eventType:"remove",
					eventValue:eventValue
				});
			}
			// if(this.options.onSelectAfter){
			// 	this.options.onSelectAfter(data);
			// }
		};
		
		//전체 keySet을 리턴
		EasiPopup.prototype.getKeySet = function(value){
			if(typeof this.options.keyExpr == "string"){
				return value[this.options.keyExpr];
			}else if(Array.isArray(this.options.keyExpr)){
				var keySet = [];
				for(var i=0;i<this.options.keyExpr.length;i++){
					keySet.push(value[this.options.keyExpr[i]]);
				}
				return JSON.stringify(keySet);
			}
		};
		
		//현재 value목록을 리턴(single모드일경우 object타입 리턴)
		EasiPopup.prototype.getValue = function(){
			var value = this.options.value;
			if(this.options.mode == "single"){
				return value.length > 0 ? value[0][this.options.keyExpr] : undefined;
			}else{
				var returnValue = [];
				for(var i=0;i<value.length;i++){
					returnValue.push(value[i][this.options.keyExpr]);
				}
				return returnValue;
			}
		}
		
		//옵션, 파라미터가 두개면 첫번째 파라미터에 해당하는 옵션을 두번째 파라미터 값으로 셋팅. 파라미터가 하나면 첫번째 파라미터에 해당하는 옵션의 값을 리턴
		EasiPopup.prototype.option = function(){
			var arg1 = arguments[0];
			var arg2 = arguments[1];
			if(arg1 && typeof arg2 != "undefined"){
				this.dispose();
				
				//value를 변경하는 경우 받은 value값이 array가 아닐경우 array로 변경해주고, button타입과 multiple타입인 경우 중복 허용 여부에 따라 중복을 제거하고 값을 입력
				if(arg1 == "value"){
					this._entrySet.clear();
					if(arg2.constructor.name === ({}).constructor.name){
						arg2 = [arg2];
					}
					if(!Array.isArray(arg2)){
						arg2 = [];
					}
					for(var i=0;i<arg2.length;i++){
						if(arg2[i].constructor.name !== ({}).constructor.name){
							arg2 = [];
							break;
						}
					}
					if(this.options.mode == "single" && arg2.length > 0){
						this._entrySet.add(this.getKeySet(arg2[0]));
						arg2 = [arg2[0]];
					}else if(this.options.mode == "button" || this.options.mode == "multiple"){
						if(!this.options.duplication){
							var arrValue = [];
							for(var i=0;i<arg2.length;i++){
								var keyData = this.getKeySet(arg2[i]);
								if(!this._entrySet.has(keyData)){
									this._entrySet.add(keyData);
									arrValue.push(arg2[i]);
								}
							}
							arg2 = arrValue;
						}
					}
				}
				var $element = this._$element;
				var options = this.options;
				options[arg1] = arg2;
				var easiPopup = new EasiPopup(options);
				$element.data("easiPopup", easiPopup);
				easiPopup._init($element);
			}else if(!arg1 && typeof arg2 == "undefined"){
				return this.options;
			//입력받은 options의 값이 object타입인 경우는 key와 value쌍으로 값 세팅
			}else if(arg1.constructor.name === ({}).constructor.name){
				this.dispose();
				//value를 변경하는 경우 받은 value값이 array가 아닐경우 array로 변경해주고, button타입과 multiple타입인 경우 중복 허용 여부에 따라 중복을 제거하고 값을 입력
				if(Object.keys(arg1).indexOf("value") > -1){
					this._entrySet.clear();
					if(arg1.value.constructor.name === ({}).constructor.name){
						arg1.value = [arg1.value];
					}
					if(!Array.isArray(arg1.value)){
						arg1.value = [];
					}
					for(var i=0;i<arg1.value.length;i++){
						if(arg1.value[i].constructor.name !== ({}).constructor.name){
							arg1.value = [];
							break;
						}
					}
					if(this.options.mode == "single" && arg1.value.length > 0){
						this._entrySet.add(this.getKeySet(arg1.value[0]));
						arg1.value = [arg1.value[0]];
					}else if(this.options.mode == "button" || this.options.mode == "multiple"){
						if(!this.options.duplication){
							var arrValue = [];
							for(var i=0;i<arg1.value.length;i++){
								var keyData = this.getKeySet(arg1.value[i]);
								if(!this._entrySet.has(keyData)){
									this._entrySet.add(keyData);
									arrValue.push(arg1.value[i]);
								}
							}
							arg1.value = arrValue;
						}
					}
				}
				var $element = this._$element;
				var options = new Object();
				$.extend(options, this.options, arg1);
				var easiPopup = new EasiPopup(options);
				$element.data("easiPopup", easiPopup);
				easiPopup._init($element);
			}else{
				return this.options[arg1];
			}
		};
		
		//easiPopup 객체 제거
		EasiPopup.prototype.dispose = function(){
			var sortable = $(this._$list).sortable("instance");
			if(sortable){
				sortable.destroy();
			}
			this._$element.removeClass("easi-popup type-button type-single type-multiple disabled");
			this._$element.off("click");
			this._$element.data("easiPopup", null);
			if(this.options.mode != "button"){
				this._$element.empty();
			}
		};
		
		//easiPopup 인스턴스 리턴
		if(params == "instance"){
			var data = $(this).data("easiPopup");
			if(!data){
				console.error("easiPopup 인스턴스가 존재하지 않습니다.");
				return;
			}
			return data;
		}
		
		//jQuery selector로 선택된 element를 easiPopup로 초기화
		$(this).each(function(){
			var $this = $(this);
			var easiPopup = $(this).data("easiPopup");
			
			//이미 easiPopup 객체가 존재하면 옵션 변경
			if(easiPopup){
				var options = new Object();
				if(!params.value){
					params.value = [];
				}else if(params.value.constructor.name === ({}).constructor.name){
					params.value = [params.value];
				}
				$.extend(options, easiPopup.options, params);
				easipopup._entrySet.clear();
				easiPopup.dispose();
				if(!options.keyExpr){
					throw new Error("keyExpr 속성은 반드시 필요합니다.");
				}
				var easiPopup = new EasiPopup(options);
				
				if(easiPopup.options.mode == "single" && easiPopup.options.value.length > 0){
					easiPopup.options.value = [easiPopup.options.value[0]];
				}else if(easiPopup.options.mode == "button" || easiPopup.options.mode == "multiple"){
					if(!easiPopup.options.duplication){
						var arrValue = [];
						for(var i=0;i<easiPopup.options.value.length;i++){
							var keyData = easiPopup.getKeySet(easiPopup.options.value[i]);
							if(!easiPopup._entrySet.has(keyData)){
								easiPopup._entrySet.add(keyData);
								arrValue.push(easiPopup.options.value[i]);
							}
						}
						easiPopup.options.value = arrValue;
					}
				}
				
				$(this).data("easiPopup", easiPopup);
				easiPopup._init($this);
			
			//easiPopup 객체가 처음 생성되는것이면 기본옵션 + 입력받은 옵션으로 easiPopup 생성
			}else{
				//기본옵션
				var defaultOptions = {
					disabled:false,
					mode:"single", //single, multiple, button
					title:"목록",
					data:{},
					keyExpr:undefined,
					displayExpr:undefined,
					sorting:true,
					duplication:false,
					url:undefined,
					popupName:"_blank",
					popupWidth:undefined,
					popupHeight:undefined,
					showTitle:true,
					onContentReady:undefined,
					onItemCreating:undefined,
					onValueChanged:undefined,
					value:[]
				};
				var options = new Object();
				if(!params.value){
					params.value = [];
				}else if(params.value.constructor.name === ({}).constructor.name){
					params.value = [params.value];
				}
				$.extend(options, defaultOptions, params);
				if(!options.keyExpr){
					throw new Error("keyExpr 속성은 반드시 필요합니다.");
				}
				var easiPopup = new EasiPopup(options);
				
				if(easiPopup.options.mode == "single" && easiPopup.options.value.length > 0){
					easiPopup._entrySet.clear();
					easiPopup._entrySet.add(easiPopup.getKeySet(easiPopup.options.value[0]));
					easiPopup.options.value = [easiPopup.options.value[0]];
				}else if(easiPopup.options.mode == "button" || easiPopup.options.mode == "multiple"){
					if(!easiPopup.options.duplication){
						var arrValue = [];
						for(var i=0;i<easiPopup.options.value.length;i++){
							var keyData = easiPopup.getKeySet(easiPopup.options.value[i]);
							if(!easiPopup._entrySet.has(keyData)){
								easiPopup._entrySet.add(keyData);
								arrValue.push(easiPopup.options.value[i]);
							}
						}
						easiPopup.options.value = arrValue;
					}
				}
				
				$(this).data("easiPopup", easiPopup);
				easiPopup._init($this);
			}
		});
		return $(this);
	};
})($); 