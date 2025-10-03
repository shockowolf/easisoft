(function ($) {
	//easiUploader 컴포넌트 정의 시작(앞에 _가 붙은 함수들은 모두 내부에서만 사용하는 변수 및 함수임)
	$.fn.easiUploader = function(params){
		function EasiUploader(options){
			this.options = options;
		}

		EasiUploader.prototype._isSorting = false; //현재 정렬을 실행중인지 여부
		EasiUploader.prototype._isInserting = false; //현재 값을 insert중인지 여부
		EasiUploader.prototype._isRemoving = false; //현재 값을 remove중인지 여부

		EasiUploader.prototype._removedAttachList = []; //초기값에서 지워진 file 정보를 저장하기 위한 변수

		//---------------------------------------------------------easiUploader 초기화
		EasiUploader.prototype._init = function($this){
			$this.addClass("easi-uploader");
			var fileChooseInput = document.createElement("input");
			fileChooseInput.type = "file";

			this._$element = $this;
			this._$fileChooseInput = $(fileChooseInput);

			//옵션으로 받은 모드 구분에 따라 나누어 처리
			if(this.options.mode == "button"){
				this._initButtonType($this);
			}else if(this.options.mode == "single"){
				this._initSingleType($this);
			}else if(this.options.mode == "multiple"){
				this._initMultipleType($this);
			}
			if(this.options.onContentReady){
				this.options.onContentReady({
					component:this,
					value:this.options.value
				});
			}
		};

		//-----------------------------------------------------------------버튼타입(선택한 리스트나 input이 보이지 않음)
		EasiUploader.prototype._initButtonType = function($this){
			var _this = this;
			$this.removeClass("type-button type-single type-multiple attached disabled").addClass("type-button");
			if(this.options.disabled){
				$this.addClass("disabled");
				return;
			}

			//파일업로더에서 파일을 선택했을때 동작
			_this._$fileChooseInput.on("change", function(e){
				var files = Array.prototype.slice.call(e.target.files);
				if(_this.options.onValidating){
					files = _this.options.onValidating({
						component:_this,
						files:files
					});
					if(files.length == 0){
						return;
					}
				}

				var values = _this.filesToValues(files); //파일 정보를 읽어 object에 담아서 리턴
				var $oldChooseInput = _this._$fileChooseInput;
				_this._$fileChooseInput = _this._$fileChooseInput.val("").clone(true);
				$oldChooseInput.remove();

				//onValueInserting결과를 받은 후 onValueInserted콜백이 있으면 실행, 추가 된 파일을 value에 추가
				var invoke = function(){
					for(var i=0;i<values.length;i++){
						if(!values[i].atchDtlId){
							values[i].file = files[i];
						}
					}
					_this._removedAttachList.length = 0;
					if(_this.options.value[0]){
						_this._removeValue(_this.options.value[0]);
					}
					_this._addValue(values);
					if(_this.options.onValueInserted){
						_this.options.onValueInserted({
							component:_this,
							value:_this.options.value,
							removedAttachList:_this._removedAttachList
						});
					}
					_this._isInserting = false;
				};

				//onValueInserting콜백이 정의되어있으면 호출한 뒤 결과가 promise일경우 resolve일때, boolean일떄는 true일때 invoke함수 실행
				if(_this.options.onValueInserting){
					_this._isInserting = true;
					var isSuccess = _this.options.onValueInserting({
						component:_this,
						files:$.extend([], files),
						values:$.extend([], values)
					});

					if(isSuccess instanceof Promise){
						isSuccess.then(function(result){
							invoke();
						}).catch(function(error){
							//console.log(error)
						});
					}else if(isSuccess){
						invoke();
					}
				}else{
					invoke();
				}
			});

			//버튼 클릭시 파일선택
			$this.on("click", function(e){
				if(!_this._isInserting && !_this._isRemoving){
					_this._$fileChooseInput.trigger("click");
				}
			});
		};

		//------------------------------------------------------------------------------------------------------------------------ single타입(선택한 파일이 input에 표시됨)
		EasiUploader.prototype._initSingleType = function($this){
			var _this = this;
			$this.removeClass("type-button type-single type-multiple attached disabled").addClass("type-single");

			var $uploaderTable = $("<div class='easi-uploader-table'/>");
			var $fileNameWrap = $("<div class='file-name-wrap'/>");
			var $fileName = $("<div class='file-name'/>");
			var $fileRemoveBtnWrap = $("<div class='file-remove'/>");
			var $fileRemoveBtn = $("<button type='button'><i class='far fa-times'></i></button>")
			var $fileBtnWrap = $("<div class='file-btn-wrap'/>");
			var $fileBtn = $("<button type='button'>파일선택</button>");

			$uploaderTable.append($fileNameWrap).append($fileRemoveBtnWrap).append($fileBtnWrap);
			$fileNameWrap.append($fileName);
			$fileRemoveBtnWrap.append($fileRemoveBtn);
			$fileBtnWrap.append($fileBtn);
			$this.append($uploaderTable);

			//파일 이름을 표시
			var showFileName = function(){
				$fileName.empty();
				var value = _this.options.value;
				if(value.length > 0){
					var $item = $("<a href='"+value[0][_this.options.pathExpr]+"'/>");
					var fileName = value[0].fileNm;

					//파일 이름 클릭시 팝업창에서 파일 열기
					$item.on("click", function(e){
						e.preventDefault();
						var popupWidth = 1024;
						var popupHeight = 1024;
						var screenWidth = window.innerWidth ? window.innerWidth : window.document.documentElement.clientWidth ? window.document.documentElement.clientWidth : screen.width;
						var screenHeight = window.innerHeight ? window.innerHeight : window.document.documentElement.clientHeight ? window.document.documentElement.clientHeight : screen.height;
						var top = window.screenTop + (screenHeight/2) - (popupWidth/2);
						var left = window.screenLeft + (screenWidth/2) - (popupHeight/2);

						window.open(this.href, "_blank", "location=no,toolbar=no, status=no, menubar=no, scrollbars=no, resizable=no, width="+popupWidth+", height="+popupHeight+", top="+top+", left="+left);
						return false;
					});

					//새로 추가된 파일일 경우 파일 이름만 표시, 기존에 있던 파일을 불러온 경우 a태그에 파일 이름을 넣어 표시
					if(value[0].atchDtlId){
						$item.text(fileName);
					}else{
						$item = fileName;
					}

					$fileName.append($item);

					_this._$element.addClass("attached");
				}
			};

			showFileName();

			//disabled상태일때는 버튼 이벤트들을 정의하지않음
			if(this.options.disabled){
				$this.addClass("disabled");
				return;
			}

			//------------------------------삭제 버튼 클릭시 value에서 해당 파일을 삭제하고 파일 이름을 비움
			$fileRemoveBtn.on("click", function(){
				_this._removeValue(_this.options.value[0], function(){
					_this._$element.removeClass("attached");
					$fileName.empty();
				});
			});


			//파일을 선택한 후 동작
			_this._$fileChooseInput.on("change", function(e){
				var files = Array.prototype.slice.call(e.target.files);
				//onValidating 콜백이 있는경우 호출하여 file목록을 필터링
				if(_this.options.onValidating){
					files = _this.options.onValidating({
						component:_this,
						files:files
					});
					if(files.length == 0){
						return;
					}
				}

				var values = _this.filesToValues(files); //파일 정보를 읽어 object에 담아서 리턴
				var $oldChooseInput = _this._$fileChooseInput;
				_this._$fileChooseInput = _this._$fileChooseInput.val("").clone(true);
				$oldChooseInput.remove();

				//onValueInserting결과를 받은 후 onValueInserted콜백이 있으면 실행, 추가 된 파일을 value에 추가
				var invoke = function(){
					for(var i=0;i<values.length;i++){
						if(!values[i].atchDtlId){
							values[i].file = files[i];
						}
					}
					if(_this.options.value[0]){
						_this._removeValue(_this.options.value[0]);
					}
					_this._addValue(values);
					if(_this.options.onValueInserted){
						_this.options.onValueInserted({
							component:_this,
							value:_this.options.value,
							removedAttachList:_this._removedAttachList
						});
					}
					showFileName();
					_this._isInserting = false;
				};

				//onValueInserting콜백이 정의되어있으면 호출한 뒤 결과가 promise일경우 resolve일때, boolean일떄는 true일때 invoke함수 실행
				if(_this.options.onValueInserting){
					_this._isInserting = true;
					var isSuccess = _this.options.onValueInserting({
						component:_this,
						files:$.extend([], files),
						values:$.extend([], values)
					});

					if(isSuccess instanceof Promise){
						isSuccess.then(function(result){
							invoke();
						}).catch(function(error){
							//console.log(error)
						});
					}else if(isSuccess){
						invoke();
					}
				}else{
					invoke();
				}
			});

			//파일찾기 버튼 클릭시 파일 input클릭 이벤트 트리거
			$fileBtn.on("click", function(e){
				if(!_this._isInserting && !_this._isRemoving){
					_this._$fileChooseInput.trigger("click");
				}
			});
		};

		//===============================================================================================================================   multiple 타입(선택한 항목이 리스트에 추가됨)
		EasiUploader.prototype._initMultipleType = function($this){
			var _this = this;
			$this.removeClass("type-button type-single type-multiple attached disabled").addClass("type-multiple");
			_this._$fileChooseInput.prop("multiple", true);

			var $uploaderTable = $("<div class='easi-uploader-table'/>");
			var $fileNameWrap = $("<div class='file-name-wrap'/>");
			var $fileName = $("<div class='file-name'>파일 수 : 0개</div>");
			var $fileBtnWrap = $("<div class='file-btn-wrap'/>");
			var $fileBtn = $("<button type='button'>파일선택</button>");
			var $fileList = $("<div class='file-list'/>");

			$uploaderTable.append($fileNameWrap).append($fileBtnWrap);
			$fileNameWrap.append($fileName);
			$fileBtnWrap.append($fileBtn);
			$this.append($uploaderTable).append($fileList);

			_this._$fileList = $fileList;

			//--------------------리스트에 선택한 파일 항목을 추가하는 동작
			var addAttachItem = function(value){

				for(var i=0;i<value.length;i++){


					/*===================================  표시할 HTML만들기  =========================================================================*/
					var $fileItem = $("<div class='file-item'/>");
					var $itemSorting = $("<div class='file-item-sorting'><i class='fad fa-sort-alt'></i></div>");
					var $itemNameWrap = $("<div class='file-item-name'/>");
					var $itemName = $("<a href='"+value[i][_this.options.pathExpr]+"' download='"+value[i].fileNm+"'/>");
					var fileName = value[i].fileNm;
					var $itemDispPosWrap   = $("<div class='file-item-disppos'/>");
					var $itemDispPos ='';
					//console.log('value[i].dispPos=======', value[i].dispPos);
					if ( value[i].dispPos  == undefined ) {
						//console.log('value[i].dispPos22=======', value[i].dispPos);
						$itemDispPos = '';
					}else {   $itemDispPos        = $("<span>" +  value[i].dispPos  + "</span> "); }

					/* ----------------------  수정아이콘 */
					var $itemEditBtnWrap   = $("<div class='file-item-edit'/>");
					if(value[i].linkUrl) {
						var $itemEditBtn = $("<a href='/admin/atchurl_update.do?atchDtlId=" + value[i].atchDtlId + "\'><button type='button'><i class='fal fa-pen es_text_red'></i></button>");
					}else {
						var $itemEditBtn = $("<a href='/admin/atchurl_update.do?atchDtlId=" + value[i].atchDtlId  + "\'><button type='button'><i class='fal fa-pen es_aaa'></i></button>");
					}

					/* ----------------------  삭제 아이콘 */
					var $itemRemoveBtnWrap = $("<div class='file-item-remove'/>");
					var $itemRemoveBtn     = $("<button type='button' class='es_tag_grid_wire'>삭제</button>");

					//-------------------------  파일 이름 클릭시 팝업창에서 파일 열기
					$itemName.on("click", function(e){
						e.preventDefault();
						var popupWidth = 1200;
						var popupHeight = 1200;
						var screenWidth = window.innerWidth ? window.innerWidth : window.document.documentElement.clientWidth ? window.document.documentElement.clientWidth : screen.width;
						var screenHeight = window.innerHeight ? window.innerHeight : window.document.documentElement.clientHeight ? window.document.documentElement.clientHeight : screen.height;
						var top = window.screenTop + (screenHeight/2) - (popupWidth/2);
						var left = window.screenLeft + (screenWidth/2) - (popupHeight/2);

						var fileLength = this.href.length;
						var fileDot = this.href.lastIndexOf(".");
						var fileType = this.href.substring(fileDot+1,fileLength);
						var imageExt = ['jpg','png','jpeg','gif'];

						function contains(target, pattern){
							var value = 0;
							pattern.forEach(function(word){
								value = value + target.toLowerCase().includes(word);
							});
							return (value === 1)
						}

						if(contains(fileType,imageExt)){
							window.open(this.href, "_blank", "location=no,toolbar=no, status=no, menubar=no, scrollbars=no, resizable=no, width="+popupWidth+", height="+popupHeight+", top="+top+", left="+left);
						}else{
							const linkEle = document.createElement('a');
							linkEle.download = this.download;
							linkEle.href = this.href;
							linkEle.click();
							console.log("다운?",linkEle)
						}

						return false;

					});

					//---------- 첨부화일상세 파일정보수정창
					$itemEditBtn.on("click", function(e){
						e.preventDefault();
						var popupWidth = 800;
						var popupHeight = 600;
						var screenWidth = window.innerWidth ? window.innerWidth : window.document.documentElement.clientWidth ? window.document.documentElement.clientWidth : screen.width;
						var screenHeight = window.innerHeight ? window.innerHeight : window.document.documentElement.clientHeight ? window.document.documentElement.clientHeight : screen.height;
						var top = window.screenTop + (screenHeight/2) - (popupWidth/2);
						var left = window.screenLeft + (screenWidth/2) - (popupHeight/2);

						window.open(this.href, "_blank", "location=no,toolbar=no, status=no, menubar=no, scrollbars=no, resizable=no, width="+popupWidth+", height="+popupHeight+", top="+top+", left="+left);
						return false;
					});



					/*===================================  표시하기 =========================================================================*/
					//------새로 추가된 파일일 경우 파일 이름만 표시, 기존에 있던 파일을 불러온 경우 a태그에 파일 이름을 넣어 표시
					if(value[i].atchDtlId){
						$itemName.text(fileName);
					}else{
						$itemName = fileName;
					}
					$itemNameWrap.append($itemName);
					$fileItem.append($itemNameWrap);

					$itemDispPosWrap.append($itemDispPos);

					//----------기존자료가 있을때문 수정아이콘 나와서 수정가능하게 한다. 신규추가시는 안보여야함
					if(value[i].atchDtlId) {
						$itemEditBtnWrap.append($itemEditBtn);
					}
					$itemRemoveBtnWrap.append($itemRemoveBtn);

					$itemNameWrap.on("dragstart", function(e){
						e.preventDefault();
						return false;
					});

					//disabled상태가 아닌경우 삭제버튼을 추가
					if(!_this.options.disabled){
						if(_this.options.sorting){
							$fileItem.prepend($itemSorting);
						}
						/*-------------------------------------- 순서대로 목록만들기---------------*/
						$fileItem.append($itemDispPosWrap);
						$fileItem.append($itemEditBtnWrap);
						$fileItem.append($itemRemoveBtnWrap);

						(function(value, $fileItem){

							//----------------------- 화일목록에서 수정아이콘버튼 클릭했을때 동작
		/*					$itemEditBtn.on("click", function(){
									_this._editValue(value, function(){

									});
							});*/
							//---------------------------화일목록에서 삭제아이콘버튼 클릭했을때 동작
							$itemRemoveBtn.on("click", function(){
								if(!_this._isSorting){
									_this._removeValue(value, function(){
										$fileItem.remove();
										$fileName.text("파일 수 : " + _this.options.value.length + "개");
										if(_this.options.sorting){
											$fileList.find(".file-item").each(function(i, el){
												$(el).attr("data-order", i+1);
											});
										}
									});
								}
							});

						})(value[i], $fileItem);
					}
					$fileList.append($fileItem);
				}

				//disabled상태가 아니고 sorting옵션이 true일때 각 항목의 순서를 지정하고 드래그앤드랍으로 정렬을 활성화
				if(!_this.options.disabled && _this.options.sorting){
					$fileList.find(".file-item").each(function(i, el){
						$(el).attr("data-order", i+1);
					});

					$fileList.sortable({
						handle:".file-item-sorting",
						stop:function(e, ui){
							var array = $fileList.sortable("toArray", {attribute:"data-order"});
							for(var i=0;i<array.length;i++){
								_this.options.value[parseInt(array[i])-1].__tempOrder__ = i+1;
							}
							var tempValue = $.extend([], _this.options.value);
							tempValue.sort(function(a, b){
								return a.__tempOrder__ - b.__tempOrder__;
							})
							for(var i=0;i<tempValue.length;i++){
								tempValue[i].orderSeq = i+1;
							}

							var successInvoke = function(){
								_this.options.value.sort(function(a, b){
									return a.__tempOrder__ - b.__tempOrder__;
								})
								for(var i=0;i<_this.options.value.length;i++){
									$fileList.find(".file-item").eq(i).attr("data-order", i+1);
									_this.options.value[i].orderSeq = i+1;
								}
								$fileList.sortable("option", "disabled", false);
								_this._isSorting = false;
								if(_this.options.onValueSorted){
									_this.options.onValueSorted({
										component:_this,
										value:_this.options.value
									});
								}
							};

							var failInvoke = function(){
								$fileList.sortable("cancel");
								for(var i=0;i<_this.options.value.length;i++){
									_this.options.value[i].orderSeq = i+1;
								}
								$fileList.sortable("option", "disabled", false);
								_this._isSorting = false;
							};

							//onValueSorting콜백이 정의되어있으면 호출한 뒤 결과가 promise일경우 resolve일때, boolean일떄는 true일때 정렬실행, 아닐경우 원래 순서로 복구
							if(_this.options.onValueSorting){
								_this._isSorting = true;
								$(this).sortable("option", "disabled", true);
								var isSuccess = _this.options.onValueSorting({
									component:_this,
									value:tempValue
								});
								if(isSuccess instanceof Promise){
									isSuccess.then(function(result){
										successInvoke();
									}).catch(function(error){
										//console.log(error)
										failInvoke();
									});
								}else if(isSuccess){
									successInvoke();
								}else{
									failInvoke();
								}
							}else{
								successInvoke();
							}
						}
					});
				}
				$fileName.text("파일 수 : " + _this.options.value.length + "개");
			};

			addAttachItem(_this.options.value);

			if(this.options.disabled){
				$this.addClass("disabled");
				return;
			}

			//파일선택 후 동작
			var fileChanges = function(files){
				//onValidating 콜백이 있는경우 호출하여 file목록을 필터링
				if(_this.options.onValidating){
					files = _this.options.onValidating({
						component:_this,
						files:files
					});
					if(files.length == 0){
						return;
					}
				}

				var values = _this.filesToValues(files);
				var $oldChooseInput = _this._$fileChooseInput;
				_this._$fileChooseInput = _this._$fileChooseInput.val("").clone(true);
				$oldChooseInput.remove();

				//onValueInserting결과를 받은 후 onValueInserted콜백이 있으면 실행, 추가 된 파일을 value에 추가
				var invoke = function(){
					for(var i=0;i<values.length;i++){
						if(!values[i].atchDtlId){
							values[i].file = files[i];
						}
					}
					_this._addValue(values);
					if(_this.options.onValueInserted){
						_this.options.onValueInserted({
							component:_this,
							value:_this.options.value,
							removedAttachList:_this._removedAttachList
						});
					}
					addAttachItem(values);
					_this._isInserting = false;
				};

				//onValueInserting콜백이 정의되어있으면 호출한 뒤 결과가 promise일경우 resolve일때, boolean일떄는 true일때 invoke함수 실행
				if(_this.options.onValueInserting){
					_this._isInserting = true;
					var isSuccess = _this.options.onValueInserting({
						component:_this,
						files:$.extend([], files),
						values:$.extend([], values)
					});

					if(isSuccess instanceof Promise){
						isSuccess.then(function(result){
							invoke();
						}).catch(function(error){
							//console.log(error)
							_this._isInserting = false;
						});
					}else if(isSuccess){
						invoke();
					}else{
						_this._isInserting = false;
					}
				}else{
					invoke();
				}
			}

			//파일을 easiUploader위에 끌어서 올려놓아 추가
			$fileList.on("dragenter dragover", function(e){
				e.stopPropagation();
				e.preventDefault();
				$(this).addClass("file-drag-enabled");
	        });
			$fileList.on("dragleave", function(e){
				e.stopPropagation();
				e.preventDefault();
				$(this).removeClass("file-drag-enabled");
	        });
			$fileList.on("drop", function(e){
				e.preventDefault();
				$(this).removeClass("file-drag-enabled");

				var files = Array.prototype.slice.call(e.originalEvent.dataTransfer.files);
				fileChanges(files);
			});

			_this._$fileChooseInput.on("change", function(e){
				var files = Array.prototype.slice.call(e.target.files);
				fileChanges(files);
			});

			//파일찾기 버튼 클릭시 동작
			$fileBtn.on("click", function(e){
				if(!_this._isInserting && !_this._isRemoving && !_this._isSorting){
					_this._$fileChooseInput.trigger("click");
				}
			});
		};

		//파일 정보를 받아서 object에 담아서 리턴
		EasiUploader.prototype.filesToValues = function(files){
			var _this = this;
			return files.map(function(obj, i){
				return {
					atchDtlId:undefined,
					atchId:undefined,
					fileRealPath:undefined,
					fileContextPath:undefined,
					fileNm:obj.name,
					fileExtNm:obj.name.indexOf(".") > -1 ? obj.name.substring(obj.name.indexOf(".")) : "",
					fileSize:obj.size,
					resize:_this.options.resize,
					orderSeq:undefined,
					atchMemo:undefined,
					mainYn:undefined,
					regDtm:undefined,
					updDtm:undefined,
					regNm:undefined
				};
			});
		};

		//-------------------------------------------------------value 비움
		EasiUploader.prototype.clearValue = function(){
			this.options.value.length = 0;
			this._removedAttachList.length = 0;
		};

		//------------------------------------------------------value추가
		EasiUploader.prototype._addValue = function(newValue){
			var value = this.options.value;
			this.options.value = value.concat(newValue);
			for(var i=0;i<this.options.value.length;i++){
				this.options.value[i].orderSeq = i+1;
			}
		};

		//--------------------------------------------------------파일화일목록에서 수정아이콘클릭시 콜백함수 호출
		EasiUploader.prototype._editValue = function(item){
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
		};

		//--------------------------------------------------------파일화일목록에서 삭제아이콘클릭시 콜백함수 호출
		EasiUploader.prototype._removeValue = function(item, callback){
			var _this = this;
			var value = this.options.value;
			var i = value.indexOf(item);
			if(i == -1){
				console.error("첨부가 존재하지 않습니다.");
				return;
			}

			//onValueRemoving 이후 동작
			var invoke = function(){
				var removedItem = _this.options.value.splice(i, 1);
				//기존에 DB에 존재했던 파일이라면 삭제를 위해 삭제된 목록에 추가
				if(item.atchDtlId){
					_this._removedAttachList.push(removedItem[0]);
				}

				//순서 재정렬
				for(var j=0;j<_this.options.value.length;j++){
					_this.options.value[j].orderSeq = j+1;
				}

				//콜백함수 파라미터가 있으면 실행
				if(callback){
					callback();
				}

				//onValueRemoved가 정의되어 있으면 호출
				if(_this.options.onValueRemoved){
					_this.options.onValueRemoved({
						component:_this
					})
				}
				_this._isRemoving = false;
			};

			this._isRemoving = true;
			//onValueRemoving콜백이 정의되어있으면 호출한 뒤 결과가 promise일경우 resolve일때, boolean일떄는 true일때 invoke함수 실행
			if(this.options.onValueRemoving && !this._isInserting){
				var isSuccess = this.options.onValueRemoving({
					component:this,
					data:item
				});

				if(isSuccess instanceof Promise){
					isSuccess.then(function(result){
						invoke();
					}).catch(function(error){
						//console.log(error)
						_this._isRemoving = false;
					});
				}else if(isSuccess){
					invoke();
				}else{
					_this._isRemoving = false;
				}
			}else{
				invoke();
			}
		};

		//옵션, 파라미터가 두개면 첫번째 파라미터에 해당하는 옵션을 두번째 파라미터 값으로 셋팅. 파라미터가 하나면 첫번째 파라미터에 해당하는 옵션의 값을 리턴
		EasiUploader.prototype.option = function(){
			var arg1 = arguments[0];
			var arg2 = arguments[1];
			if(arg1 && typeof arg2 != "undefined"){
				this.dispose();
				if(arg1 == "value"){
					this.clearValue();
					this._isInserting = false;
					this._isRemoving = false;
					if(!Array.isArray(arg2)){
						arg2 = [];
					}
				}
				var $element = this._$element;
				var options = this.options;
				options[arg1] = arg2;
				var easiUploader = new EasiUploader(options);
				$element.data("easiUploader", easiUploader);
				easiUploader._init($element);
			}else if(!arg1 && typeof arg2 == "undefined"){
				return this.options;
			}else if(arg1.constructor.name === ({}).constructor.name){
				this.dispose();
				if(Object.keys(arg1).indexOf("value") > -1){
					this.clearValue();
					this._isInserting = false;
					this._isRemoving = false;
					if(!Array.isArray(arg1.value)){
						arg1.value = [];
					}
				}
				var $element = this._$element;
				var options = new Object();
				$.extend(options, this.options, arg1);
				var easiUploader = new EasiUploader(options);
				$element.data("easiUploader", easiUploader);
				easiUploader._init($element);
			}else{
				return this.options[arg1];
			}
		};

		//-------------------------------------------------- 모든 value 리턴
		EasiUploader.prototype.getData = function(){
			return {
				value:this.options.value,
				removedAttachList:this._removedAttachList
			};
		};

		//----------------------------------------------------파일업로더에서 관리하고 있는 파일목록 리턴
		EasiUploader.prototype.getFiles = function(){
			var files = [];
			this.options.value.forEach(function(value, i){
				if(value.file){
					files.push(value.file);
				}
			});
			return files;
		};

		//--------------------------------------------------------파일업로더 새로고침
		EasiUploader.prototype.refresh = function(){
			var $element = this._$element;
			var options = this.options;
			this.dispose();
			var easiUploader = new EasiUploader(options);
			$element.data("easiUploader", easiUploader);
			easiUploader._init($element);
		};

		//파일업로더 객체 제거
		EasiUploader.prototype.dispose = function(){
			var sortable = $(this._$fileList).sortable("instance");
			if(sortable){
				sortable.destroy();
			}
			this._$fileChooseInput.off("click");
			this._$fileChooseInput.remove();
			this._$element.removeClass("easi-uploader type-button type-single type-multiple disabled");
			this._$element.off("click");
			this._$element.data("easiUploader", null);
			if(this.options.mode != "button"){
				this._$element.empty();
			}
		};

		//파일업로더 인스턴스 리턴
		if(params == "instance"){
			var data = $(this).data("easiUploader");
			if(!data){
				console.error("easiUploader 인스턴스가 존재하지 않습니다.");
				return;
			}
			return data;
		}

		//jQuery selector로 선택된 element를 easiUploader으 초기화
		$(this).each(function(){
			var $this = $(this);
			var easiUploader = $(this).data("easiUploader");

			//이미 easiUploader 객체가 존재하면 옵션 변경
			if(easiUploader){
				var options = new Object();
				$.extend(options, easiUploader.options, params);
				easiUploader.dispose();
				var easiUploader = new EasiUploader(options);
				$(this).data("easiUploader", easiUploader);
				easiUploader._init($this);
			//easiUploader 객체가 처음 생성되는것이면 기본옵션 + 입력받은 옵션으로 easiUploader 생성
			}else{
				var defaultOptions = {
					disabled:false,
					mode:"single", //single, multiple, button
					valueExpr:"atchDtlId",
					displayExpr:"fileNm",
					orderExpr:"orderSeq",
					resize:true,
					sorting:false,
					pathExpr:"fileContextPath",
					onContentReady:undefined,
					onValidating:undefined,
					onValueSorting:function(e){
						return true;
					},
					onValueSorted:undefined,
					onValueInserting:function(e){
						return true;
					},
					onValueInserted:undefined,
					onValueRemoving:function(e){
						return true;
					},
					onValueRemoved:undefined,
					value:[]
				};
				var options = new Object();
				$.extend(options, defaultOptions, params);
				var easiUploader = new EasiUploader(options);
				$(this).data("easiUploader", easiUploader);
				easiUploader._init($this);
			}
		});
		return $(this);
	};
})($);