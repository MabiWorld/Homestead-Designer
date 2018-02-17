var WIKI_BASE_URL = "https://wiki.mabinogiworld.com/api.php";

var CATEGORY_NS = 14;

function normsOfResponse(response) {
	var norms = {};

	if ("normalized" in response) {
		var loop = response.normalized;
		for (var i = loop.length; i >= 0; --i) {
			norms[loop.to] = loop.from;
		}
	}

	return norms;
}

function getPageContents(pages, success, error) {
	if (typeof pages == "string") {
		pages = [pages];
	}

	$.ajax({
		"url": WIKI_BASE_URL,
		"method": "GET",
		"data": {
			"action": "query",
			"prop": "revisions",
			"rvprop": "content",
			"format": "json",
			"titles": pages.join("|"),
		},
		"success": function (data) {
			var pages = data.query.pages;

			var norms = normsOfResponse(data);

			var result = {};

			for (var pid in pages) {
				var page = pages[pid];

				if (pid < 0) {
					error(null, "404", page.title + " not found");
				} else {
					var key = page.title in norms ? norms[page.title] : page.title;

					result[key] = page.revisions[0]["*"];
				}
			}

			success(result);
		},
		"error": error || console.warn,
	});
}

function getImageURLs(images, success, error) {
	if (typeof images == "string") {
		images = [images];
	}

	$.ajax({
		"url": WIKI_BASE_URL,
		"method": "GET",
		"data": {
			"action": "query",
			"prop": "imageinfo",
			"iiprop": "url",
			"format": "json",
			"titles": images.join("|"),
		},
		"success": function (data) {
			var pages = data.query.pages;

			var norms = normsOfResponse(data);

			var result = {};

			for (var pid in pages) {
				var page = pages[pid];

				if (pid < 0) {
					error(null, "404", page.title + " not found");
				} else {
					var key = page.title in norms ? norms[page.title] : page.title;

					result[key] = page.imageinfo[0].url;
				}
			}

			success(result);
		},
		"error": error || console.warn,
	});
}

// category: <string> Category name
// update: <function (total member number)> Function called as searches are downloaded.
// success: <function (members)> Callback for final result.
// error: <function error(xhr, textStatus, thrownError)> Callback for error in result.
// recurse: <bool> Recurse into subcategories or not, keeping only unique members.
function getCategoryMembers(categories, options) {
	options = options || {};
	options.error = options.error || console.warn;

	options.out = 0;
	options.members = [];

	if (typeof categories == "string") {
		categories = [categories];
	}

	for (var i = 0; i < categories.length; ++i) {
		getCategoryMembers_cont("Category:" + categories[i], options);
	}
}

function getCategoryMembers_cont(category, options, cont) {
	var data = {
		"action": "query",
		"list": "categorymembers",
		"format": "json",
		"cmprop": "title",
		"cmtitle": category,
		"cmlimit": 500,
	};

	if (cont) {
		data.cmcontinue = cont;
	}

	++options.out;

	$.ajax({
		"url": WIKI_BASE_URL,
		"method": "GET",
		"data": data,
		"success": function (data) {
			--options.out;

			var pages = data.query.categorymembers;

			if ("update" in options) {
				options.update(options.members.length + pages.length);
			} 

			for (var pid = 0; pid < pages.length; ++pid) {
				var page = pages[pid];

				if (page.ns == CATEGORY_NS) {
					if (options.recurse) {
						getCategoryMembers_cont(page.title, options);
					}
				} else {
					options.members.push(page.title);
				}
			}

			if ("continue" in data) {
				getCategoryMembers_cont(category, options, data.continue.cmcontinue);
			}
			else if (options.out == 0) {
				var members = options.members;
				members.sort();

				for (var i=members.length - 1; i > 0; --i) {
					if (members[i] == members[i-1]) {
						members.splice(i, 1);
					}
				}

				options.update(options.members.length);

				options.success(members);
			}
		},
		"error": options.error,
	});
}
