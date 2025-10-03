(function ($) {
	//easitreegrid 컴포넌트 정의 시작(앞에 _가 붙은 함수들은 모두 내부에서만 사용하는 함수임)
	$.fn.easiTreeGrid = function(params){
		function EasiTreeGrid(options){
			this.options = options;
		}

		//--------------------------------------------------------------easitreegrid init함수
		EasiTreeGrid.prototype._init = function($element){
			var _this = this;
			_this.isCtrl = false; //shift키가 눌려있는지 여부
			_this.isShift = false; //ctrl키가 눌려있는지 여부
			_this.internalKeyExpr = "___key___"; //dataSource에 그리드 생성시 지정한 key값을 저장하기위한 key값
			_this.internalParentKeyExpr = "___parentKey___"; //dataSource에 그리드 생성시 지정한 부모의 key값을 저장하기위한 key값
			_this.internalRootKeyExpr = "___rootKey___"; //dataSource에 그리드 생성시 지정한 최상위 key값을 저장하기위한 key값

			//shift, ctrl키를 누르고 떼는 이벤트 처리
			$(document).on("keydown", function(e){
				if(e.keyCode == 16){
					_this.isShift = true;
				}
				if(e.keyCode == 17){
					_this.isCtrl = true;
				}
			});

			$(document).on("keyup", function(e){
				if(e.keyCode == 16){
					_this.isShift = false;
				}
				if(e.keyCode == 17){
					_this.isCtrl = false;
				}
			});

			$element.addClass("easi-tree-grid");
			var $table = $("<table class='easi-tree-grid-table'>");
			this._$element = $element;
			this._$element.append($table);

			//shift키를 누른상태로 여러행을 선택할떄 텍스트가 선택되지 않게 하기위한 처리
			$table.on("mousedown", "tr", function(e){
				if(_this.isShift){
					window.getSelection().removeAllRanges();
				}
			});

			//최하위 자식노드 목록을 가져와서 저장
			var leafNodes = _this._getLeafNodesByList(_this.options.dataSource);
			_this.options.leafNodes = leafNodes;

			//입력받은 dataSource를 트리 형태로 변환
			var tree = _this._listToTree(_this.options.dataSource);
			_this._sortingRows({tree:tree});

			_this.options.tree = tree;

			//dataSource가 변경될때 선택했던 key가 dataSource에 없으면 선택항목에서 제거
			var filteringEmptyNode = function(tree, sets, resultSets){
				var resultSets = resultSets ? resultSets : new Map();
				for(var i=0;i<tree.length;i++){
					if(sets.delete(_this._getKey(tree[i]))){
						resultSets.set(_this._getKey(tree[i]), tree[i]);
					}
					if(tree[i][_this.options.childrenExpr] && tree[i][_this.options.childrenExpr].length > 0){
						filteringEmptyNode(tree[i][_this.options.childrenExpr], sets, resultSets);
					}
				}
				return resultSets;
			};

			var selectedNodes = filteringEmptyNode(tree, _this.options.selectedRowSets);
			_this.options.selectedRowSets.clear();
			selectedNodes.forEach(function(value, key){
				_this.options.selectedRowSets.set(key, value);
			});

			//펼쳐져있는 상태의 row가 있다면 그대로 펼친 상태로 그리기 위해 key값들을 저장
			var expandedNodes = filteringEmptyNode(tree, _this.options.expandedKeys);
			_this.options.expandedKeys.clear();
			expandedNodes.forEach(function(value, key){
				_this.options.expandedKeys.add(key);
			});


			this._createHeader();

			//filter row가 있을때 필터 조건에 맞는 값을 찾아서 세팅
			var findTree = _this._findNodes({tree:tree}).findNodes;
			this._createDataRows(findTree);

			if(this.options.onContentReady){
				this.options.onContentReady({
					component:this
				});
			}
		};

		//------------------------------------------------------------------파라미터로 받은 data의 key값을 리턴
		EasiTreeGrid.prototype._getKey = function(data){
			var _this = this;
			if(data[_this.internalKeyExpr] !== null && data[_this.internalKeyExpr] !== undefined){
				return data[_this.internalKeyExpr];
			}

			var key;
			if(Array.isArray(_this.options.keyExpr)){
				key = [];
				for(var i=0;i<_this.options.keyExpr.length;i++){
					key.push(data[_this.options.keyExpr[i]]);
				}
			}else{
				key = data[_this.options.keyExpr];
			}
			key = JSON.stringify(key);
			data[_this.internalKeyExpr] = key;
			return key;
		};

		//------------------------------------------------------------------파라미터로 받은 data의 부모의 key값을 리턴
		EasiTreeGrid.prototype._getParentKey = function(data){
			var _this = this;
			if(data[_this.internalParentKeyExpr] !== null && data[_this.internalParentKeyExpr] !== undefined){
				return data[_this.internalParentKeyExpr];
			}

			var parentKey;
			if(Array.isArray(_this.options.parentKeyExpr)){
				parentKey = [];
				for(var i=0;i<_this.options.parentKeyExpr.length;i++){
					parentKey.push(data[_this.options.parentKeyExpr[i]]);
				}
			}else{
				parentKey = data[_this.options.parentKeyExpr];
			}
			parentKey = JSON.stringify(parentKey);
			data[_this.internalParentKeyExpr] = parentKey;
			return parentKey;
		};

		//----------------------------------------------------------------파라미터로 받은 data의 최상위 key값을 리턴
		EasiTreeGrid.prototype._getRootKey = function(){
			var _this = this;
			if(_this[_this.internalRootKeyExpr] !== null && _this[_this.internalRootKeyExpr] !== undefined){
				return _this[_this.internalRootKeyExpr];
			}

			var rootKey;
			if(Array.isArray(_this.options.rootKey)){
				rootKey = [];
				for(var i=0;i<_this.options.rootKey.length;i++){
					rootKey.push(_this.options.rootKey[i]);
				}
			}else{
				rootKey = _this.options.rootKey;
			}
			rootKey = JSON.stringify(rootKey);
			_this[_this.internalRootKeyExpr] = rootKey;
			return rootKey;
		};

		//------------------------------------------------------------------정렬 조건이 있을경우 정렬조건에 맞게 row를 정렬
		EasiTreeGrid.prototype._sortingRows = function(params){
			var _this = this;
			var tree = params.tree;
			var depth = params.depth ? params.depth : 1;
			var sortingMap = _this.options.sortingMap;
			if(depth == 1){
				sortingMap.sort(function(a, b){
					if(a.sortIndex > b.sortIndex){
						return 1;
					}
					if(a.sortIndex < b.sortIndex){
						return -1;
					}
					return 0;
				});
			}
			for(var i=0;i<tree.length;i++){
				if(tree[i][_this.options.childrenExpr] && tree[i][_this.options.childrenExpr].length > 0){
					_this._sortingRows({tree:tree[i][_this.options.childrenExpr], depth:depth+1});
				}
			}
			for(var i=sortingMap.length-1;i>=0;i--){
				tree.sort(function(a, b){
					var sortResult = 0;
					if(a[sortingMap[i].dataField] > b[sortingMap[i].dataField] || (a[sortingMap[i].dataField] !== null && b[sortingMap[i].dataField] !== undefined && (b[sortingMap[i].dataField] === null || b[sortingMap[i].dataField] === undefined))){
						sortResult = 1;
					}
					if(a[sortingMap[i].dataField] < b[sortingMap[i].dataField] || ((a[sortingMap[i].dataField] === null || b[sortingMap[i].dataField] === undefined) && b[sortingMap[i].dataField] !== null && b[sortingMap[i].dataField] !== undefined)){
						sortResult = -1;
					}
					return sortingMap[i].sortOrder == "desc" ? sortResult*-1 : sortResult;
				});
			}
		};

		//----------------------------------------------------------------array에서 최하위 노드들을 찾아서 리턴
		EasiTreeGrid.prototype._getLeafNodesByList = function(list){
			var _this = this;
			_this.options._parentNodes = {};
			_this.options._nodeMap = {};
			var leafNodes = {};
			var tempList = [];
			var map = {};
			for(var i=0;i<list.length;i++){
				map[_this._getKey(list[i])] = i;
				tempList[i] = 0;
				_this.options._nodeMap[_this._getKey(list[i])] = list[i];
			}

			for(var i=0;i<list.length;i++){
				var node = list[i];
				if(Array.isArray(_this.options._parentNodes[_this._getParentKey(list[i])])){
					_this.options._parentNodes[_this._getParentKey(list[i])].push(node);
				}else{
					_this.options._parentNodes[_this._getParentKey(list[i])] = [node];
				}
				if(map[_this._getParentKey(node)] !== undefined){
					tempList[map[_this._getParentKey(node)]]++;
				}
			}

			for(var i=0;i<list.length;i++){
				if(tempList[i] === 0){
					leafNodes[_this._getKey(list[i])] = list[i];
				}
			}
			return leafNodes;
		};

		//--------------------------------------------------------------------------array를 트리 형태로 변환하여 리턴
		EasiTreeGrid.prototype._listToTree = function(list, withoutRoot){
			var _this = this;
			var roots = [];
			var map = {};
			for(var i=0;i<list.length;i++){
				map[_this._getKey(list[i])] = i;
				list[i][_this.options.childrenExpr] = [];
			}

			for(var i=0;i<list.length;i++){
				var node = list[i];
				if(map[_this._getParentKey(node)] !== undefined && (_this._getParentKey(node) !== _this._getRootKey() || withoutRoot)){
					list[map[_this._getParentKey(node)]][_this.options.childrenExpr].push(node);
				}else{
					if(_this._getRootKey() == _this._getParentKey(node) || withoutRoot){
						roots.push(node);
					}
				}
			}
			return roots;
		};

		//----------------------------------------------------------------------tree형태의 데이터를 flat한 array로 변환하여 리턴
		EasiTreeGrid.prototype._treeToList = function(param){
			var _this = this;
			var tree = param.tree;
			var list = param.list ? param.list : [];
			for(var i=0;i<tree.length;i++){
				list.push(tree[i]);
				if(tree[i][_this.options.childrenExpr] && tree[i][_this.options.childrenExpr].length > 0){
					_this._treeToList({tree:tree[i][_this.options.childrenExpr], list:list});
				}
			}
			return list;
		};

		/*
		EasiTreeGrid.prototype._treeSort = function(tree){
			var _this = this;
			for(var i=0;i<tree.length;i++){
				if(tree[i][_this.options.childrenExpr] && tree[i][_this.options.childrenExpr].length > 0){
					_this._treeSort(tree[i][_this.options.childrenExpr]);
				}
			}
			tree.sort(function(a, b){
				if(a[_this.options.sortExpr] > b[_this.options.sortExpr]){
					return 1;
				}
				if(a[_this.options.sortExpr] < b[_this.options.sortExpr]){
					return -1;
				}
				return 0;
			});
		};
		*/

		//------------------------------------------------------------------------헤더 필터조건이 있을때 필터 조건에 해당하는 row를 찾아서 셋팅
		EasiTreeGrid.prototype._findNodes = function(param){
			var _this = this;
			var depth = param.depth ? param.depth : 1;
			var findNodes = param.findNodes ? param.findNodes : [];
			var tree = param.tree ? param.tree : _this.options.tree;
			var findMap = _this.options.filterMap;
			var findKeys = Object.keys(findMap);
			var resultCnt = 0;

			if(depth == 1){
				var doFind = false;
				for(var i=0;i<findKeys.length;i++){
					if(findMap[findKeys[i]].searchText){
						doFind = true;
						break;
					}
				}
				if(!doFind){
					return {resultCnt:0, findNodes:tree};
				}
			}
			for(var i=0;i<tree.length;i++){
				var childResultCnt = 0;
				var isMatched = true;
				var data = Object.assign({}, tree[i]);
				for(var j=0;j<findKeys.length;j++){
					var key = findKeys[j];
					var findText = findMap[key].searchText;
					var calcValue = findMap[key].calcValue;
					var orgText = data[key];
					if(calcValue){
						orgText = calcValue({component:_this, value:orgText, depth:depth, data:data});
					}
					if(findText && (orgText === "" || orgText === null || orgText === undefined || orgText.toString().toLowerCase().indexOf(findText.toLowerCase()) === -1)){
						isMatched = false;
						break;
					}
				}
				if(data[_this.options.childrenExpr] && data[_this.options.childrenExpr].length > 0){
					childResultCnt += _this._findNodes({tree:data[_this.options.childrenExpr], findNodes:findNodes, depth:depth+1}).resultCnt;
				}

				if(isMatched || childResultCnt > 0){
					findNodes.push(data);
					if(isMatched){
						data.___isSearchResult = true;
						resultCnt++;
					}else if(childResultCnt > 0){
						resultCnt += childResultCnt;
					}
				}
			}
			if(depth == 1){
				var findNodes = _this._listToTree(findNodes);
			}
			return {resultCnt:resultCnt, findNodes:findNodes};
		};

		//-------------------------------------------------------------------------------파라미터로 받은 데이터가 최하위 노드인지 판단하여 treu, false값으로 리턴
		EasiTreeGrid.prototype.isLeafNode = function(param){
			if(typeof param == "string" || Array.isArray(param)){
				return this.options.leafNodes[JSON.stringify(param)] ? true : false;
			}else{
				return this.options.leafNodes[this._getKey(param)] ? true : false;
			}
		};

		//---------------------------------------------------------------------------------파라미터로 받은 데이터가 최상위 노드인지 판단하여 treu, false값으로 리턴
		EasiTreeGrid.prototype.isRootNode = function(param){
			if(typeof param == "string" || Array.isArray(param)){
				return JSON.stringify(param) === this._getRootKey();
			}else{
				return this._getParentKey(param) === this._getRootKey();
			}
		};

		//----------------------------------------------------------------------------key값을 받아서 key에 해당하는 rowData를 리턴
		EasiTreeGrid.prototype.getNode = function(key, isStringified){
			if(isStringified){
				return this.options._nodeMap[JSON.stringify(key)];
			}else{
				return this.options._nodeMap[key];
			}
		};

		//------------------------------------------------------------------------------트리에 노드를 추가
		EasiTreeGrid.prototype.addNode = function(node, afterRefresh){
			if(!this.getNode(this._getKey(node))){
				if(!this.isRootNode(node) && !this.getNode(this._getParentKey(node, true))){
					return false;
				}
				var siblingNodes = this.getChildrenNodes(this._getParentKey(node), true);
				node[this.options.sortExpr] = siblingNodes ? siblingNodes.length+1 : 1;
				this.options._parentNodes[this._getParentKey(node)] = this.options._parentNodes[this._getParentKey(node)] ? this.options._parentNodes[this._getParentKey(node)] : [];
				this.options._parentNodes[this._getParentKey(node)].push(node);
				this.options._nodeMap[this._getKey(node)] = node;
				this.options.dataSource.push(node);
			}
			if(afterRefresh){
				this.refresh();
			}
			return true;
		};

		//--------------------------------------------------------------------------트리에 노드를 array로 입력받아서 추가
		EasiTreeGrid.prototype.addNodeList = function(nodes){
			var _this = this;
			var tree = _this._listToTree(nodes, true);
			var errCnt = 0;
			var pushNodes = function(list){
				for(var i=0;i<list.length;i++){
					if(!_this.addNode(list[i])){
						errCnt++;
						continue;
					}
					if(list[i][_this.options.childrenExpr] && list[i][_this.options.childrenExpr].length > 0){
						pushNodes(list[i][_this.options.childrenExpr]);
					}
				}
			}
			pushNodes(tree);
			_this.refresh();
			return errCnt;
		};

		//-----------------------------------------------------------------------------파라미터로 입력받은 노드의 자식노드 목록을 리턴
		EasiTreeGrid.prototype.getChildrenNodes = function(param, isStringified){
			var _this = this;
			var key;
			if(typeof param == "string" || Array.isArray(param)){
				if(isStringified){
					key = param;
				}else{
					key = JSON.stringify(param);
				}
			}else{
				key = _this._getKey(param);
			}
			return _this.options._parentNodes[key];
		};

		//------------------------------------------------------------------------------헤더row생성
		EasiTreeGrid.prototype._createHeader = function(){
			var _this = this;
			var $thead = $("<thead></thead>");
			var $headerRow = $("<tr>");
			var $filterRow = $("<tr>");
			$thead.append($headerRow);
			$thead.append($filterRow);
			var index = 0;

			//옵션으로 정의된 columns 목록만큼 반복
			for(var i=0;i<this.options.columns.length;i++){
				var column = this.options.columns[i];
				//visible이 false인 column인 경우 실제로 생성안함
				if(column.visible === false){
					continue;
				}
				var $th = $("<th>");
				var $thInner = $("<div class='easi-tree-grid-header-row-inner'>");

				//selection이 multiple이고 처음 column인경우 checkbox를 생성(전체 선택 checkbox)
				if(_this.options.selection == "multiple" && index == 0){
					var $thCheckboxWrap = $("<div class='easi-tree-grid-header-row-checkbox-wrap'>");
					var $checkAll = $("<input type='checkbox' class='easi-tree-grid-all-checkbox'>");
					_this._$allCheckbox = $checkAll;

					//전체 선택 체크박스 클릭시 동작(전체선택, 전체선택해제)
					$checkAll.on("change", function(e){
						var $trList = _this._$element.find("> .easi-tree-grid-table > tbody > tr").not(".easi-tree-grid-empty-row");
						var isChanged = false;
						if($(this).is(":checked")){
							for(var j=0;j<$trList.length;j++){
								var key = $trList.eq(j).attr("data-key");
								if(!_this.options.selectedRowSets.has(key)){
									isChanged = true;
									var data = _this.options._nodeMap[key];
									_this.options.selectedRowSets.set(key, data);
									$trList.eq(j).addClass("selected");
									$trList.eq(j).find(".easi-tree-grid-checkbox").prop("checked", true);
								}
							}
						}else{
							for(var j=0;j<$trList.length;j++){
								var key = $trList.eq(j).attr("data-key");
								if(_this.options.selectedRowSets.has(key)){
									isChanged = true;
									_this.options.selectedRowSets.delete(key);
									$trList.eq(j).removeClass("selected");
									$trList.eq(j).find(".easi-tree-grid-checkbox").prop("checked", false);
								}
							}
						}
						if(_this.options.onSelectionChanged && isChanged){
							_this.options.onSelectionChanged({
								component:_this,
								selectedRowKeys:_this.getSelectedRowKeys(),
								selectedRowsData:_this.getSelectedRowsData()
							});
						}
					});
					$thCheckboxWrap.append($checkAll);
					$thInner.append($thCheckboxWrap);
				}
				var $thContent = $("<div class='easi-grid-header-row-content'>");
				if(column.dataField){
					//정렬 기능이 false일떄
					if(column.allowSorting === false || !_this.options.allowSorting){
						var findSortingMap = _this.options.sortingMap.find(function(obj){
							return obj.dataField == column.dataField;
						});
						if(findSortingMap){
							$th.addClass(findSortingMap.sortOrder);
						}
					//정렬기능이 true일때
					}else{
						$th.addClass("allow-sorting");
						(function(column, $th){
							//헤더 row를 클릭했을때 정렬로직
							$th.on("click", function(e){
								if($(e.target).hasClass("easi-tree-grid-all-checkbox")){
									return;
								}
								var isCtrl = _this.isCtrl;
								var isShift = _this.isShift;
								var findIndex;
								var findSortingMap = _this.options.sortingMap.find(function(obj, index){
									var isDone = obj.dataField == column.dataField;
									if(isDone){
										findIndex = index;
										return isDone;
									}
								});
								if(isCtrl || isShift){
									if(findSortingMap){
										$th.removeClass("asc desc");
										if(findSortingMap.sortOrder == "desc"){
											_this.options.sortingMap.splice(findIndex, 1);
										}else{
											$th.addClass(findSortingMap.sortOrder == "asc" ? "desc" : "asc");
											findSortingMap.sortOrder = findSortingMap.sortOrder == "asc" ? "desc" : "asc";
										}
									}else{
										$th.addClass("asc");
										_this.options.sortingMap.push({dataField:column.dataField, sortIndex:_this.options.sortingMap[_this.options.sortingMap.length-1] ? _this.options.sortingMap[_this.options.sortingMap.length-1].sortIndex+1 : 0, sortOrder:"asc", calcValue:column.customizeText});
									}
								}else{
									_this.options.sortingMap = [];
									$th.removeClass("asc desc");
									if(findSortingMap){
										if(findSortingMap.sortOrder != "desc"){
											$th.addClass(findSortingMap.sortOrder == "asc" ? "desc" : "asc");
											_this.options.sortingMap.push({dataField:column.dataField, sortIndex:1, sortOrder:findSortingMap.sortOrder == "asc" ? "desc" : "asc", calcValue:column.customizeText})
										}
									}else{
										$th.addClass("asc");
										_this.options.sortingMap.push({dataField:column.dataField, sortIndex:1, sortOrder:"asc", calcValue:column.customizeText})
									}
								}
								_this.refresh();
							});
							//헤더 row를 더블클릭했을때 text가 선택되는것을 방지
							$th.on("mousedown", function(e){
								if(e.originalEvent.detail > 1){
									e.preventDefault();
								}
							});
						})(column, $th);
					}
					var findSortingMap = _this.options.sortingMap.find(function(obj){
						return obj.dataField == column.dataField;
					});
					if(findSortingMap){
						$th.addClass(findSortingMap.sortOrder);
					}
					$thContent.text(column.caption);
				}else{
					$thContent.text(column.caption);
				}


				//$thContent.addClass(column.cssClass);
				$thInner.append($thContent);
				$th.css("width", column.width);
				$th.css("minWidth", column.minWidth);
				$th.append($thInner);
				$headerRow.append($th);
				index++;
			}

			//수정, 삭제 기능이 true일때 각각 수정 삭제 버튼이 들어갈 컬럼을 생성
			if(this.options.allowUpdate){
				var $th = $("<th  rowspan=2 style='background-color: #eeeeee;'>");
				$th.text("수정");
				$th.css("width", 50);
				$th.css("min-width", 50);
				$th.css("max-width", 80);
				$headerRow.append($th);
			}

			if(this.options.allowDelete){
				var $th = $("<th  rowspan=2 style='background-color: #eeeeee;'>");
				$th.text("삭제");
				$th.css("width", 50);
				$th.css("min-width", 50);
				$th.css("max-width", 80);
				$headerRow.append($th);
			}

			this._$element.find("> .easi-tree-grid-table").append($thead);

			//헤더에 filter row 옵션이 false일때 아래 코드 사용안함
			if(!this.options.showFilterRow){
				return;
			}
			for(var i=0;i<this.options.columns.length;i++){
				var column = this.options.columns[i];
				if(column.visible === false){
					continue;
				}
				var $th = $("<th class='easi-tree-grid-filter-row'>");

				if(column.allowFiltering !== false){
					var $searchWrap = $("<div class='easi-tree-grid-search-wrapper'>");
					var $searchInput = $("<input type='text' class='search-text-input' value='"+this.options.filterMap[column.dataField].searchText+"'>");
					/*var $searchBtn = $("<div class='search-button'><i class='fal fa-search'></i></div>");*/
					$searchWrap.append($searchInput);
					/*$searchWrap.append($searchBtn);*/
					$th.append($searchWrap);
				}
				//$th.addClass(column.cssClass);
				$filterRow.append($th);

				//filter row에 값이 입력됐을때 data를 필터링하는 기능
				(function(column){
					var fnSearch = function(value){
						_this.options.filterMap[column.dataField].searchText = value;
						var findTree = _this._findNodes({tree:_this.options.tree}).findNodes;

						var columns = _this.options.columns;
						var isSearchResult = false;
						for(var i=0;i<columns.length;i++){
							if(columns[i].allowFiltering === false){
								continue;
							}
							if(_this.options.filterMap[columns[i].dataField].searchText != null && _this.options.filterMap[columns[i].dataField].searchText != undefined && _this.options.filterMap[columns[i].dataField].searchText != ""){
								isSearchResult = true;
								break;
							}
						}
						if(isSearchResult){
							_this.options._tempExpandedKeys = new Set(_this.options.expandedKeys);
							_this.expandAll();
						}else{
							if(_this.options._tempExpandedKeys){
								_this.options.expandedKeys = new Set(_this.options._tempExpandedKeys);
							}else{
								_this.collapseAll();
							}
						}
						_this._$element.find("> .easi-tree-grid-table > tbody").remove();
						_this._createDataRows(findTree);
					};

					if(column.allowFiltering === false){
						return;
					}
					if(navigator.userAgent.indexOf("MSIE") > -1 || navigator.userAgent.indexOf("Trident") > -1){
						$searchInput.on("keyup", function(e){
							if(e.keyCode == 13){
								fnSearch(e.target.value);
							}
						});
					}
					$searchInput.on("change", function(e){
						fnSearch(e.target.value);
					});
				})(column);
			}

/*			if(this.options.allowUpdate){
				var $th = $("<th class='easi-tree-grid-filter-row'>");
				$filterRow.append($th);
			}

			if(this.options.allowDelete){
				var $th = $("<th class='easi-tree-grid-filter-row'>");
				$filterRow.append($th);
			}*/
		};

		//key값을 받아서 rowData를 리턴
		EasiTreeGrid.prototype.getRowDataByKey = function(key){
			return this.options._nodeMap[JSON.stringify(key)];
		};

		//선택된 rowData들을 리턴
		EasiTreeGrid.prototype.getSelectedRowsData = function(){
			var selectedRowsData = [];
			this.options.selectedRowSets.forEach(function(value, key){
				selectedRowsData.push(value);
			});
			return selectedRowsData;
		};

		//선택된 row key값들을 리턴
		EasiTreeGrid.prototype.getSelectedRowKeys = function(){
			var _this = this;
			var selectedRowKeys = [];
			this.options.selectedRowSets.forEach(function(value, key){
				var parsedKey = JSON.parse(key);
				var obj = {};
				if(Array.isArray(_this.options.keyExpr)){
					for(var i=0;i<_this.options.keyExpr.length;i++){
						obj[_this.options.keyExpr[i]] = parsedKey[i];
					}
				}else{
					obj[_this.options.keyExpr] = parsedKey;
				}
				selectedRowKeys.push(obj);
			});
			return selectedRowKeys;
		};

		//전체선택해제
		EasiTreeGrid.prototype.clearSelection = function(){
			var isChanged = this.options.selectedRowSets.size > 0;
			this.options.selectedRowSets.clear();
			var $table = this._$element.find("> .easi-tree-grid-table");
			$table.find("> tbody > tr").removeClass("selected");
			if(this.options.selection == "multiple"){
				$table.find(".easi-tree-grid-checkbox").prop("checked", false);
				this._$element.find("> .easi-tree-grid-table > thead > tr .easi-tree-grid-all-checkbox").prop("checked", false);
			}
			if(this.options.onSelectionChanged && isChanged){
				this.options.onSelectionChanged({
					component:this,
					selectedRowKeys:this.getSelectedRowKeys(),
					selectedRowsData:this.getSelectedRowsData()
				});
			}
		};

		//전체선택
		EasiTreeGrid.prototype.selectAll = function(param){
			var $trList = this._$element.find("> .easi-tree-grid-table > tbody > tr").not(".easi-tree-grid-empty-row");
			var isChanged = false;
			var _this = this;
			var $table = this._$element.find("> .easi-tree-grid-table");

			for(var i=0;i<$trList.length;i++){
				var key = $trList.eq(i).attr("data-key");
				if(!this.options.selectedRowSets.has(key)){
					isChanged = true;
					_this.options.selectedRowSets.set(key, _this.options._nodeMap[key]);
				}
			}
			$table.find("> tbody > tr").not(".easi-tree-grid-empty-row").addClass("selected");
			if(this.options.selection == "multiple"){
				$table.find(".easi-tree-grid-checkbox").prop("checked", true);
				_this._$element.find("> .easi-tree-grid-table > thead > tr .easi-tree-grid-all-checkbox").prop("checked", true);
			}
			if(_this.options.onSelectionChanged && isChanged){
				_this.options.onSelectionChanged({
					component:_this,
					selectedRowKeys:_this.getSelectedRowKeys(),
					selectedRowsData:_this.getSelectedRowsData()
				});
			}
		};

		//파라미터로 받은 데이터의 하위 노드의 key값들을 리턴(받은 데이터 자신의 키 포함)
		EasiTreeGrid.prototype.getLowerParentNodeKeys = function(data, arr){
			var _this = this;
			var keys = arr ? arr : [];
			if(data[_this.options.childrenExpr] && data[_this.options.childrenExpr].length > 0){
				keys.push(_this._getKey(data));
				for(var i=0;i<data[_this.options.childrenExpr].length;i++){
					_this.getLowerParentNodeKeys(data[_this.options.childrenExpr][i], keys);
				}
			}
			return keys;
		};

		//파라미터로 받은 데이터의 하위 노드의 key값들을 리턴(받은 데이터 자신의 키 미포함)
		EasiTreeGrid.prototype.getLowerNodeKeys = function(data, arr){
			var _this = this;
			var keys = arr ? arr : [];
			keys.push(_this._getKey(data));
			if(data[_this.options.childrenExpr] && data[_this.options.childrenExpr].length > 0){
				for(var i=0;i<data[_this.options.childrenExpr].length;i++){
					_this.getLowerNodeKeys(data[_this.options.childrenExpr][i], keys);
				}
			}
			return keys;
		};

		//파라미터로 받은 데이터의 상위 노드의 key값들을 리턴
		EasiTreeGrid.prototype.getHigherNodeKeys = function(data, arr){
			var _this = this;
			var keys = arr ? arr : [];
			keys.push(_this._getKey(data));
			var parentNode = _this.options._nodeMap[_this._getParentKey(data)];
			if(parentNode && _this._getKey(parentNode)){
				_this.getHigherNodeKeys(parentNode, keys);
			}
			return keys;
		};

		//트리가 펼쳐진 상태인지 체크
		EasiTreeGrid.prototype.isExpanded = function(param, isStringified){
			var _this = this;
			var key;
			if(typeof param == "string" || Array.isArray(param)){
				if(isStringified){
					key = param;
				}else{
					key = JSON.stringify(param);
				}
			}else{
				key = _this._getKey(param);
			}
			return _this.options.expandedKeys.has(key);
		};

		//트리를 접는다
		EasiTreeGrid.prototype.collapse = function(param, isStringified){
			var _this = this;
			var keys;
			var key;
			if(typeof param == "string" || Array.isArray(param)){
				var rowData = _this.options.dataSource.find(function(obj){
					return _this._getKey(obj) == isStringified ? param : JSON.stringify(param);
				});
				keys = rowData ? _this.getLowerParentNodeKeys(rowData[0]) : [];
				key = isStringified ? param : JSON.stringify(param);
			}else{
				keys = _this.getLowerParentNodeKeys(param);
				key = _this._getKey(param);
			}
			var $tr = _this._$element.find("> .easi-tree-grid-table > tbody > tr[data-key='"+key+"']");
			if(!$tr.hasClass("easi-tree-grid-expandable")){
				return;
			}
			$tr.removeClass("easi-tree-grid-expanded").addClass("easi-tree-grid-collapsed");
			_this.options.expandedKeys.delete(key);
			for(var i=0;i<keys.length;i++){
				_this._$element.find("> .easi-tree-grid-table > tbody > tr[data-parentKey='"+keys[i]+"']").addClass("easi-tree-grid-hidden");
			}
		};

		//트리를 펼친다
		EasiTreeGrid.prototype.expand = function(param, isStringified){
			var _this = this;
			var keys;
			var key;
			if(typeof param == "string" || Array.isArray(param)){
				var rowData = _this.options.dataSource.find(function(obj){
					return _this._getKey(obj) == isStringified ? param : JSON.stringify(param);
				});
				keys = rowData ? _this.getLowerParentNodeKeys(rowData[0]) : [];
				key = param;
			}else{
				keys = _this.getLowerParentNodeKeys(param);
				key = _this._getKey(param);
			}
			var $tr = _this._$element.find("> .easi-tree-grid-table > tbody > tr[data-key='"+key+"']");
			if(!$tr.hasClass("easi-tree-grid-expandable")){
				return;
			}
			$tr.removeClass("easi-tree-grid-collapsed").addClass("easi-tree-grid-expanded");
			_this.options.expandedKeys.add(key);
			for(var i=0;i<keys.length;i++){
				if(_this.options.expandedKeys.has(keys[i])){
					_this._$element.find("> .easi-tree-grid-table > tbody > tr[data-parentKey='"+keys[i]+"']").removeClass("easi-tree-grid-hidden");
				}
			}
		};

		//-------------------------------------------- 트리의 모든 노드를 접기
		EasiTreeGrid.prototype.collapseAll = function(){
			var $trList = this._$element.find("> .easi-tree-grid-table > tbody > tr").not(".easi-tree-grid-empty-row");
			var $table = this._$element.find("> .easi-tree-grid-table");
			for(var i=0;i<$trList.length;i++){
				this.options.expandedKeys.delete($trList.eq(i).attr("data-key"));
			}
			$table.find("> tbody > tr.easi-tree-grid-expanded").removeClass("easi-tree-grid-expanded").addClass("easi-tree-grid-collapsed");
			$table.find("> tbody > tr[data-parentKey]").addClass("easi-tree-grid-hidden");
		};

		//-------------------------------------------- 트리의 모든 노드를 펼치기
		EasiTreeGrid.prototype.expandAll = function(){
			var _this = this;
			var $trList = this._$element.find("> .easi-tree-grid-table > tbody > tr").not(".easi-tree-grid-empty-row");
			var $table = this._$element.find("> .easi-tree-grid-table");
			for(var i=0;i<$trList.length;i++){
				var key = $trList.eq(i).attr("data-key");
				var obj = _this.options._nodeMap[key];
				if(obj[_this.options.childrenExpr] && obj[_this.options.childrenExpr].length > 0){
					_this.options.expandedKeys.add(key);
				}
			}
			$table.find("> tbody > tr.easi-tree-grid-collapsed").removeClass("easi-tree-grid-collapsed").addClass("easi-tree-grid-expanded");
			$table.find("> tbody > tr[data-parentKey]").removeClass("easi-tree-grid-hidden");
		};

		//-------------------------------------------data row생성
		EasiTreeGrid.prototype._createDataRows = function(tree){
			var _this = this;

			var createRowElement = function(param){
				var tree      = param.tree;
				var $tbody    = param.$tbody;
				var depth     = param.depth;
				var parent    = param.parent ? param.parent : null;
				var parentKey = parent ? _this._getKey(parent) : null;
				var depth     = depth ? depth : 1;
				var isVisible = param.isVisible;

				for(var i=0;i<tree.length;i++){
					var data = tree[i];
					var $tr = $("<tr>");
					//현재 노드가 접힌 상태인지 닫힌 상태인지 판단하여 그대로 출력
					if(tree[i][_this.options.childrenExpr] && tree[i][_this.options.childrenExpr].length > 0){
						$tr.addClass("easi-tree-grid-expandable");
						if(_this.options.expandedKeys.has(_this._getKey(tree[i]))){
							$tr.addClass("easi-tree-grid-expanded");
						}else{
							$tr.addClass("easi-tree-grid-collapsed");
						}
					}
					if(depth > 1){
						//부모 노드가 접힌 상태이면 생성하지 않음
						if(!isVisible || !_this.options.expandedKeys.has(parentKey)){
							$tr.addClass("easi-tree-grid-hidden");
						}
					}
					$tr.attr("data-key", _this._getKey(data));
					if(parentKey){
						$tr.attr("data-parentKey", parentKey);
					}

					if(data.___isSearchResult){
						$tr.addClass("search-result");
					}

					if(_this.options.selection != "none"){
						(function($tr, data){
							if(_this.options.selection == "single"){
								//row를 클릭했을때 행을 선택하는 처리
								$tr.on("click", function(){
									if(!_this.options.selectedRowSets.has(_this._getKey(data))){
										_this.options.selectedRowSets.clear();
										_this.options.selectedRowSets.set(_this._getKey(data), data);
										$tbody.find(" > tr").removeClass("selected");
										$tr.addClass("selected");
									}else if(_this.isCtrl || _this.isShift){
										window.getSelection().removeAllRanges();
										_this.options.selectedRowSets.clear();
										$tbody.find(" > tr").removeClass("selected");
									}
									if(_this.options.onSelectionChanged){
										_this.options.onSelectionChanged({
											component:_this,
											selectedRowKeys:_this.getSelectedRowKeys(),
											selectedRowsData:_this.getSelectedRowsData()
										});
									}
								});
							}else if(_this.options.selection == "multiple"){
								//row를 클릭했을때 행을 선택하는 처리
								$tr.on("click", function(e){
									if(!$(e.target).hasClass("easi-tree-grid-checkbox") && !_this.isCtrl && !_this.isShift){
										return;
									}
									e.stopPropagation();
									var childrenKeys = _this.getLowerNodeKeys(data);
									if(_this.options.selectedRowSets.has(_this._getKey(data))){
										_this._$element.find("> .easi-tree-grid-table > thead > tr .easi-tree-grid-all-checkbox").prop("checked", false);
										for(var j=0;j<childrenKeys.length;j++){
											_this._$element.find("> .easi-tree-grid-table > tbody > tr[data-key='"+childrenKeys[j]+"'] > td > .easi-tree-grid-td-inner > .easi-tree-grid-icon-container > .easi-tree-grid-checkbox-wrap > .easi-tree-grid-checkbox").prop("checked", false);
											_this.options.selectedRowSets.delete(childrenKeys[j]);
											_this._$element.find("> .easi-tree-grid-table > tbody > tr[data-key='"+childrenKeys[j]+"']").removeClass("selected");
											if(!_this.options.selectWithChildren){
												break;
											}
										}
									}else{
										var parentKeys = _this.getHigherNodeKeys(data);
										for(var j=0;j<parentKeys.length;j++){
											_this._$element.find("> .easi-tree-grid-table > tbody > tr[data-key='"+parentKeys[j]+"'] > td > .easi-tree-grid-td-inner > .easi-tree-grid-icon-container > .easi-tree-grid-checkbox-wrap > .easi-tree-grid-checkbox").prop("checked", true);
											_this.options.selectedRowSets.set(parentKeys[j], _this.options._nodeMap[parentKeys[j]]);
											_this._$element.find("> .easi-tree-grid-table > tbody > tr[data-key='"+parentKeys[j]+"']").addClass("selected");
											if(!_this.options.selectWithParent){
												break;
											}
										}
										for(var j=0;j<childrenKeys.length;j++){
											_this._$element.find("> .easi-tree-grid-table > tbody > tr[data-key='"+childrenKeys[j]+"'] > td > .easi-tree-grid-td-inner > .easi-tree-grid-icon-container > .easi-tree-grid-checkbox-wrap > .easi-tree-grid-checkbox").prop("checked", true);
											_this.options.selectedRowSets.set(childrenKeys[j], _this.options._nodeMap[childrenKeys[j]]);
											_this._$element.find("> .easi-tree-grid-table > tbody > tr[data-key='"+childrenKeys[j]+"']").addClass("selected");
											if(!_this.options.selectWithChildren){
												break;
											}
										}
									}
									var $trList       = _this._$element.find("> .easi-tree-grid-table > tbody > tr");
									var isAllCheck    = true;
									var len           = $trList.length;
									for(var j=0;j<len;j++){
										var key = $trList.eq(j).attr("data-key");
										if(!_this.options.selectedRowSets.has(key)){
											isAllCheck = false;
											break;
										}
									}
									_this._$element.find("> .easi-tree-grid-table > thead > tr .easi-tree-grid-all-checkbox").prop("checked", isAllCheck);
									if(_this.options.onSelectionChanged){
										_this.options.onSelectionChanged({
											component:_this,
											selectedRowKeys:_this.getSelectedRowKeys(),
											selectedRowsData:_this.getSelectedRowsData()
										});
									}
								});
							}

							//------------------------------------- 접힌 상태와 열린 상태의 icon표시
							$tr.on("click", ".easi-tree-grid-icon", function(e){
								e.stopPropagation();
								var keys = _this.getLowerParentNodeKeys(data);

								if($tr.hasClass("easi-tree-grid-collapsed")){

									$tr.removeClass("easi-tree-grid-collapsed").addClass("easi-tree-grid-expanded");
									_this.options.expandedKeys.add(_this._getKey(data));
									for(var k=0;k<keys.length;k++){
										if(_this.options.expandedKeys.has(keys[k])){
											_this._$element.find("> .easi-tree-grid-table > tbody > tr[data-parentKey='"+keys[k]+"']").removeClass("easi-tree-grid-hidden");
										}
									}
								}else{
									$tr.removeClass("easi-tree-grid-expanded").addClass("easi-tree-grid-collapsed");
									_this.options.expandedKeys.delete(_this._getKey(data));
									for(var k=0;k<keys.length;k++){
										_this._$element.find("> .easi-tree-grid-table > tbody > tr[data-parentKey='"+keys[k]+"']").addClass("easi-tree-grid-hidden");
									}
								}
							});
						})($tr, data);
					}

					//--------------------------------------------------- row 더블클릭 이벤트가 지정되어있을경우 더블클릭인지 판별하여 콜백 실행
					if(_this.options.onRowDblClick){
						(function(data){
							var lastClickTime = 0;
							$tr.on("click", function(e){
								if($(e.target).hasClass("easi-tree-grid-checkbox") || _this.isCtrl || _this.isShift){
									return;
								}
								var now = new Date();
								if(now - lastClickTime > 300){
									lastClickTime = now;
								}else{
									lastClickTime = 0;
									_this.options.onRowDblClick({
										component:_this,
										data:data
									});
								}
							});

							$tr.on("mousedown", function(e){
								if(e.originalEvent.detail > 1){
									e.preventDefault();
								}
							});
						})(data);
					}
					$tbody.append($tr);

					var index = 0;

					for(var j=0;j<_this.options.columns.length;j++){

						var column        = _this.options.columns[j];
						if(column.visible === false){
							continue;
						}
						//customizeText 옵션이 있을경우 text를 치환하여 출력
						var text = data[column.dataField] == null ? undefined : data[column.dataField];
						if(column.customizeText){
							text = column.customizeText({
								component:_this,
								value:text,
								data:data,
								level:depth
							});
						}
						var $td = $("<td>");

						//-------------------------------첫번쨰 컬럼인경우 선택을 위한 checkbox 생성
						if(index == 0){
							var $tdInner       = $("<div class='easi-tree-grid-td-inner'>");
							var $iconContainer = $("<div class='easi-tree-grid-icon-container'>");
							var $emptySpace    = $("<div class='easi-tree-grid-empty-space'>");
							var $icon          = $("<div class='easi-tree-grid-icon'>");
							var $checkbox      = $("<div class='easi-tree-grid-checkbox-wrap'><input type='checkbox' class='easi-tree-grid-checkbox'></div>");
							var $content       = $("<div class='easi-tree-grid-content'>");

							//cellTemplate옵션이 있을경우 cellTemplate콜백을 실행
							if(column.cellTemplate){
								column.cellTemplate({
									component:_this,
									container:$content,
									value:text,
									data:data,
									rowIndex:i
								});
							}else{
								$content.html(text);
							}
							$content.addClass(column.cssClass);
							$content.css("text-align", column.align);

							$emptySpace.css("width", 14*(depth-1));

							$iconContainer.append($emptySpace).append($icon);
							$tdInner.append($iconContainer).append($content);
							$td.append($tdInner);

							if(_this.options.selection == "multiple"){
								$iconContainer.append($checkbox);
							}
						}else{
							//cellTemplate옵션이 있을경우 cellTemplate콜백을 실행
							if(column.cellTemplate){
								column.cellTemplate({
									component:_this,
									container:$td,
									value:text,
									data:data,
									rowIndex:i
								});
							}else{
								$td.html(text);
							}
							$td.addClass(column.cssClass);
							$td.css("text-align", column.align);
						}
						$tr.append($td);
						index++;
					}

					//---------------------------------------------------수정버튼 아이콘을 만들고 클릭 이벤트 콜백을 호출
					if(_this.options.allowUpdate){
						/*var $updateBtn = $("<button type='button'><i class='fal fa-pen'></i></button>");*/
						var $updateBtn = $("<button type='button' style='background-color: white; border:1px solid #ccc; border-radius:5px; padding:4px 12px;'>수정</button>");

						(function(data){
							$updateBtn.on("click", function(e){
								e.stopPropagation();
								if(_this.options.onRowUpdating){
									_this.options.onRowUpdating({
										component:_this,
										data:data
									});
								}
							})
						})(data);

						var $td = $("<td>");
						$td.append($updateBtn);
						$td.addClass("update-column");
						$tr.append($td);
					}

					//----------------------------------------삭제버튼 아이콘을 만들고 클릭 이벤트 콜백을 호출
					if(_this.options.allowDelete){
						var $deleteBtn = $("<button type='button'><i class='fal fa-trash-alt'></i></button>");
						/*var $deleteBtn = $("<button type='button'><i class='fal fa-times' style='color:#888; font-size:18px;'></i></button>");*/

						(function(data){
							$deleteBtn.on("click", function(e){
								e.stopPropagation();
								if(_this.options.onRowDeleting){
									_this.options.onRowDeleting({
										component:_this,
										data:data
									});
								}
							})
						})(data);

						var $td = $("<td>");
						$td.append($deleteBtn);
						$td.addClass("delete-column");
						$tr.append($td);
					}

					//-----------------------------------------------하위 노드가 없을때까지 재귀
					if(data[_this.options.childrenExpr] && data[_this.options.childrenExpr].length > 0){
						createRowElement({tree:data[_this.options.childrenExpr], $tbody:$tbody, depth:depth+1, parent:data, isVisible:depth == 1 || isVisible ? _this.options.expandedKeys.has(_this._getKey(data)) : false});
					}

					//selection된 데이터이면 체크박스를 checked상태로 바꿈
					if(_this.options.selectedRowSets.has(_this._getKey(data))){
						$tr.addClass("selected");
						if(_this.options.selection == "multiple"){
							$tr.find(".easi-tree-grid-checkbox").prop("checked", true);
						}
					}

					//----------------------------------------------------------rowPrepared옵션이 있을때 onRowPrepared 콜백을 실행
					if(_this.options.onRowPrepared){
						_this.options.onRowPrepared({
							component:_this,
							data:data,
							rowElement:$tr
						});
					}
				}
			};
			var $tbody = $("<tbody></tbody>");
			//------------------------------------------------------만들어진 tree의 길이가 0보다 크면(데이터가 있으면 rowData생성)
			if(tree.length > 0){
				_this._sortingRows({tree:tree});
				createRowElement({tree:tree, $tbody:$tbody});
			//만들어진 tree의 길이가 0이면 데이터 없음을 출력
			}else{
				var columnCnt = 0;
				for(var i=0;i<_this.options.columns.length;i++){
					if(_this.options.columns[i].visible !== false){
						columnCnt++;
					}
				}
				if(_this.options.allowUpdate){
					columnCnt++;
				}
				if(_this.options.allowDelete){
					columnCnt++;
				}
				var $tr = $("<tr class='easi-tree-grid-empty-row'>");
				var $td = $("<td colspan='"+columnCnt+"'>조회된 데이터가 없습니다</td>");
				$tr.append($td);
				$tbody.append($tr);
			}

			//-------------------------------------------------------selection이 multiple인경우 모든 데이터가 선택된 상태가 아니라면 전체체크박스의 상태를 false로 바꿈
			if(_this.options.selection == "multiple"){
				var isAllCheck = true;
				var $trList = $tbody.find("> tr");
				for(var i=0;i<$trList.length;i++){
					var key = $trList.eq(i).attr("data-key");
					if(key == undefined || !_this.options.selectedRowSets.has(key)){
						isAllCheck = false;
						break;
					}
				}
				this._$element.find("> .easi-tree-grid-table > thead > tr .easi-tree-grid-all-checkbox").prop("checked", isAllCheck);
			}
			this._$element.find("> .easi-tree-grid-table > tbody").remove();
			this._$element.find("> .easi-tree-grid-table").append($tbody);
		};


		//-------------------------------------------------------------------------모든 필터링 제거
		EasiTreeGrid.prototype.clearFiltering = function(){
			var _this = this;
			var filterMap = _this.options.filterMap;
			var columns = _this.options.columns;
			for(var i=0;i<columns.length;i++){
				if(columns[i].allowFiltering === false){
					continue;
				}
				filterMap[columns[i].dataField].searchText = "";
			}

			var findTree = _this._findNodes({tree:_this.options.tree}).findNodes;
			_this._$element.find("> .easi-tree-grid-table > thead .search-text-input").val("");
			this._createDataRows(findTree);
			_this.collapseAll();
		};

		//------------------------------------------------------------------------------------모든 정렬조건 제거
		EasiTreeGrid.prototype.clearSorting = function(){
			var _this = this;
			_this.options.sortingMap = [];
			_this.refresh();
		};


		//옵션, 파라미터가 두개면 첫번째 파라미터에 해당하는 옵션을 두번째 파라미터 값으로 셋팅. 파라미터가 하나면 첫번째 파라미터에 해당하는 옵션의 값을 리턴
		EasiTreeGrid.prototype.option = function(){
			var arg1 = arguments[0];
			var arg2 = arguments[1];
			if(arg1 && typeof arg2 != "undefined"){
				this.dispose();
				var $element = this._$element;
				var options = this.options;
				options[arg1] = arg2;
				var easiTreeGrid = new EasiTreeGrid(options);
				$element.data("easiTreeGrid", easiTreeGrid);
				easiTreeGrid._init($element);
			}else if(!arg1 && typeof arg2 == "undefined"){
				return this.options;
			}else if(arg1.constructor.name === ({}).constructor.name){
				this.dispose();
				var $element = this._$element;
				var options = new Object();
				$.extend(options, this.options, arg1);
				var easiTreeGrid = new EasiTreeGrid(options);
				$element.data("easiTreeGrid", easiTreeGrid);
				easiTreeGrid._init($element);
			}else{
				return this.options[arg1];
			}
		};

		//--------------------------------------------------------------------------------treegrid 새로고침
		EasiTreeGrid.prototype.refresh = function(){
			this.dispose();
			var $element = this._$element;
			var options = this.options;
			var easiTreeGrid = new EasiTreeGrid(options);
			$element.data("easiTreeGrid", easiTreeGrid);
			easiTreeGrid._init($element);
		};

		//----------------------------------------------------------------그리드 객체 제거
		EasiTreeGrid.prototype.dispose = function(){
			$(this._$element).data("easiTreeGrid", undefined);
			$(this._$element).empty();
		};

		//그리드 객체 리턴
		if(params == "instance"){
			var data = $(this).data("easiTreeGrid");
			if(!data){
				console.error("easiTreeGrid 인스턴스가 존재하지 않습니다.");
				return;
			}
			return data;
		}

		//------------------------------------------------------------------------jQuery selector로 선택된 element를 grid로 초기화
		$(this).each(function(){
			var $this = $(this);
			var easiTreeGrid = $(this).data("easiTreeGrid");

			//이미 그리드 객체가 존재하면 옵션 변경
			if(easiTreeGrid){
				var options = new Object();
				if(!params.dataSource){
					params.dataSource = [];
				}
				$.extend(options, easiTreeGrid.options, params);
				easiTreeGrid.dispose();
				var easiTreeGrid = new EasiTreeGrid(options);

				$(this).data("easiTreeGrid", easiTreeGrid);
				easiTreeGrid._init($this);

			//그리드 객체가 처음 생성되는것이면 기본옵션 + 입력받은 옵션으로 그리드 생성
			}else{
				//기본옵션
				var defaultOptions = {
					columns:[],
					dataSource:[],
					filterMap:new Object(),
					expandedKeys:new Set(),
					_tempExpandedKeys:undefined,
					sortingMap:new Array(),
					selectedRowSets:new Map(),
					selection:"single", //single, multiple, none
					allowSorting:true,
					allowUpdate:true,
					allowDelete:true,
					rootKey:"",
					keyExpr:undefined,
					parentKeyExpr:undefined,
					childrenExpr:"___children",
					selectWithParent:true,
					selectWithChildren:true,
					showFilterRow:true,
					onRowDblClick:undefined,
					onRowUpdating:undefined,
					onRowDeleting:undefined,
					onSelectionChanged:undefined
				};
				var options = new Object();
				$.extend(options, defaultOptions, params);
				options.columns.forEach(function(obj){
					if(obj.allowFiltering !== false){
						options.filterMap[obj.dataField] = {searchText:"", calcValue:obj.customizeText};
					}
					if(!isNaN(obj.sortIndex)){
						options.sortingMap.push({dataField:obj.dataField, sortIndex:obj.sortIndex, sortOrder:obj.sortOrder ? obj.sortOrder : "asc", calcValue:obj.customizeText});
					}
				});
				var easiTreeGrid = new EasiTreeGrid(options);

				$(this).data("easiTreeGrid", easiTreeGrid);
				easiTreeGrid._init($this);
			}
		});
		return $(this);
	};
})($);