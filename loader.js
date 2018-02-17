var HS_CAT_BLACKLIST = {
	"Gardening": true,
	"Homestead": true,
	"Homestead Kit": true,
	"Homestead Seeds": true,
	"Homestead Stone (Homestead)": true,
	"Paint": true,
}

$(function () {
	var cache = loadFromCache();

	if (!cache) {
		getCategoryMembers("Homestead Items", {
			"update": updateLoadTotals,
			"success": onLoadHomesteadList,
			"error": onErrorHomesteadList,
			"recurse": false,
		});
	}
});

function updateLoadedDisplay(current, total) {
	if (current != undefined) {
		$("#current-assets-loaded").text(current);
	}

	if (total != undefined) {
		$("#total-assets-to-load").text(total);
	}
}

var CAT_PAGES_LOADED = 0;
function updateLoadTotals(total) {
	++CAT_PAGES_LOADED;

	updateLoadedDisplay(CAT_PAGES_LOADED, CAT_PAGES_LOADED + total);
}

var LOADED_PAGES = 0, ERRORED_PAGES = 0, NEED_UI = 0;
function updateFinalDisplay(total) {
	var current = CAT_PAGES_LOADED + LOADED_PAGES + ERRORED_PAGES;

	if (total) total += NEED_UI;

	updateLoadedDisplay(current, total);

	if (total == undefined) {
		total = parseInt($("#total-assets-to-load").text());
	}

	if (current >= total) {
		cacheAndHideLoading();
		showDesigner();
	}
}


var UI_IMAGES = [
	"icon_empty_building.png",
	"icon_empty_product.png",
	"icon_empty_farmland.png",
	"icon_empty_ornament.png",
	"icon_empty_animal.png",
	"icon_empty_furniture.png",
];
function preloadUI() {
	for (var i = UI_IMAGES.length - 1; i >= 0; i--) {
		var img = UI_IMAGES[i];
		preloadImage(img, "imgs/" + img);
	}
}


var HOMESTEAD_ITEMS = [], HOMESTEAD_ITEM_DATA = {};
function onLoadHomesteadList(list) {
	--CAT_PAGES_LOADED;
	var total = CAT_PAGES_LOADED + list.length * 2 + UI_IMAGES.length;
	updateLoadedDisplay(CAT_PAGES_LOADED, total);

	preloadUI();

	// Load homestead data and their images.
	while (list.length) {
		var query = list.splice(0, 10);

		for (var i = query.length - 1; i >= 0; --i) {
			var qq = query[i];
			if (qq in HS_CAT_BLACKLIST){
				query.splice(i, 1);
				total -= 2;
				updateFinalDisplay(total);
			}
			else {
				query[i] = "Template:Data" + qq;
				HOMESTEAD_ITEMS.push(qq);
			}
		}

		if (query.length) {
			getPageContents(query, onLoadDataPages, onErrorDataPages);
		}
	}
}

function onErrorHomesteadList(xhr, status, error) {
	$(".loading h4").text("Error loading assets (" + status + ").");
	$(".loading > div").text(error);
}

function onLoadDataPages(pages) {
	for (var page in pages) {
		++LOADED_PAGES;
		updateFinalDisplay();

		var name = page.replace("Template:Data", "");
		var content = pages[page];

		var re = /^\|([^=]+)=(.+)$/gm;
		var mo, data = {};
		while ((mo=re.exec(content)) != null) {
			data[mo[1]] = mo[2];
		}

		HOMESTEAD_ITEM_DATA[name] = data;

		// Find the image name.
		var icon = data.Icon || data.Name;

		if (icon == undefined) {
			console.warn(page, "may have unformatted data.");
		}
		else {
			icon = icon.replace(/<!--.*?-->/g, "").trim();
			getImageURLs("File:" + icon + ".png", onLoadImageURL(name), onErrorImageURL);
		}
	}
}

function onErrorDataPages(xhr, status, error) {
	++ERRORED_PAGES;
	console.warn(status, error);
	updateFinalDisplay();
}


function onLoadImageURL(name) {
	return function (images) {
		for (var image in images) {
			var link = images[image];
			HOMESTEAD_ITEM_DATA[name].iconURL = link;
			preloadImage(name, link);
			break;
		}
	}
}

function preloadImage(name, link) {
	var id = name + "-icon";
	$("<img>").attr({
		"id": id,
		"src": link,
	})
	.appendTo("#preloads")
	.on("load", onPreloadComplete);
}

function onErrorImageURL(xhr, status, error) {
	++ERRORED_PAGES;
	console.warn(status, error);
	updateFinalDisplay();
}

function onPreloadComplete() {
	++LOADED_PAGES;
	updateFinalDisplay();
}

function setCacheUpdatedDate(dateObj) {
	var date = dateObj.toLocaleString();
	var time = dateObj.toLocaleTimeString();
	date = date.replace(time, "").trim();

	$(".cache-update-date").text(date);
	$(".cache-update-time").text(time);
}

function cacheAndHideLoading() {
	var updated = new Date();

	setCacheUpdatedDate(updated);
	localStorage.setItem("updated", updated.toString());

	localStorage.setItem("homesteadItems", HOMESTEAD_ITEMS.join("<,>"));

	for (var i = HOMESTEAD_ITEMS.length - 1; i >= 0; i--) {
		var name = HOMESTEAD_ITEMS[i];
		var item = HOMESTEAD_ITEM_DATA[name];

		var key = "homesteadItem_" + name;

		localStorage.setItem(key, JSON.stringify(item));
	}

	$(".loading").hide();
}

function loadFromCache() {
	var updated = localStorage.getItem("updated");
	var homesteadItems = localStorage.getItem("homesteadItems");

	if (!updated || !homesteadItems) return false;

	var date = new Date(updated);
	setCacheUpdatedDate(date);

	HOMESTEAD_ITEMS = homesteadItems.split("<,>");

	updateLoadedDisplay(0, HOMESTEAD_ITEMS.length + UI_IMAGES.length);

	preloadUI();

	for (var i = HOMESTEAD_ITEMS.length - 1; i >= 0; i--) {
		var name = HOMESTEAD_ITEMS[i];
		var key = "homesteadItem_" + name;

		var item = localStorage.getItem(key);

		item = HOMESTEAD_ITEM_DATA[name] = JSON.parse(item);

		if ("iconURL" in item) {
			preloadImage(name, item.iconURL);
		}
		else {
			++LOADED_PAGES;
		}
	}

	return true;
}
