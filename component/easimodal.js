(function ($) {
	$.fn.easiModal = function(params){
		console.log(params);
		
		var options = new Object();
		
		var $modalOverlay = $("<div class='easi-modal-overlay'>");
		var $modalContainer = $("<div class='easi-modal-container'>");
		var $modalHeader = $("<div class='easi-modal-header'>");
		var $modalTitle = $("<div class='easi-modal-title'></div>");
		var $modalCloseBtn = $("<div class='easi-modal-close'><button type='button' class='easi-modal-close-btn'><i class='dx-icon dx-icon-close'></i></button></div>");
		var $modalContent = $("<div class='easi-modal-content'>");
		var $modalScrollView = $("<div class='easi-modal-scrollview'>");
		options.scope = "easipopup" + new Date().getTime() + parseInt(Math.random() * 1000000);
		
		
		$("body").append($modalContent);
		
		$.jQueryAjax({
			type:"post",
			url:params.url,
			data:params.data,
			success:function(html){
				$(".easi-modal-container").html(html);
				$("html").css({
					"height":"100%",
				});
//						$(window).on("mousewheel DOMMouseScroll dxmousewheel dxpointermove touchmove", scrollLock);
				$modalContent.css({"visibility":"visible"});
			},
			error:function(xhr, status, error){
			}
		});
	};
})($); 