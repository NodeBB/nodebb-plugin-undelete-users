'use strict';

/* globals $, ajaxify, app, define */

define('admin/plugins/undelete-users', ['api', 'bootbox'], function (api, bootbox) {
	const ACP = {};
	const PLUGIN_ID = 'undelete-users';
	let itemContainer;

	ACP.init = function () {
		itemContainer = document.querySelector('.undelete-users ul.list-group');

		$('.undelete').on('click', undelete);
		$('.load-more').on('click', loadMore);
		$('#filter').on('click', filter);
	};

	function undelete(ev) {
		bootbox.confirm('Are you sure to restore the user?', (confirm) => {
			if (!confirm) {
				return;
			}
			const eid = ev.target.getAttribute('data-eid');
			api.post(`/plugins/${PLUGIN_ID}/undelete/`, { eid }).then(({ tmpPassword }) => {
				const $item = $(ev.target).parents('.list-group-item');
				$item.hide(500, () => {
					const $tmpPwCon = $(`<li class="list-group-item"><strong>Generated temporary password:</strong> <span class="label label-info">${tmpPassword}</span>. (This won't be visible after leaving the page.)</li>`);
					$tmpPwCon.hide();
					$item.after($tmpPwCon);
					$tmpPwCon.show(500);
					$item.remove();
				});
				app.alertSuccess('User restored. To make changes effective, you may need to restart your NodeBB instance.');
			}).catch(app.alertError);
		});
	}

	async function loadMore({ target: el }) {
		try {
			el.setAttribute('disabled', 'disabled');
			const page = el.getAttribute('data-page');
			const searchParams = new URLSearchParams(window.location.search);
			searchParams.set('page', page);

			const templateData = await api.get(`/api/admin/plugins/${PLUGIN_ID}?${searchParams.toString()}`, {});
			const html = await app.parseAndTranslate(templateData.template.name, 'events', templateData);
			itemContainer.append(...html.get());

			if (templateData.loadMore) {
				el.setAttribute('data-page', templateData.loadPage);
				el.removeAttribute('disabled');
			} else {
				el.remove();
			}
		} catch (err) {
			app.alertError(err);
		}
	}

	function filter(ev) {
		ev.preventDefault();
		ev.target.setAttribute('disabled', 'disabled');
		ajaxify.go(`admin/plugins/${PLUGIN_ID}?` + $('#filters').serialize(), () => {
			ev.target.removeAttribute('disabled');
		});
	}

	return ACP;
});
