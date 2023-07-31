<div class="row events undelete-users">
	<div class="col-lg-9">
		<div class="card">
			<div class="card-header"><i class="fa fa-user-cog"></i> Users to Undelete</div>
			<div class="card-body">
				{{{ if !events.length }}}
				<div class="alert alert-info">There are no users to restore with their contents.</div>
				{{{ end }}}
				<ul data-type="list" class="list-group mb-2">
					{{{ each events }}}
						<!-- IMPORT partials/item.tpl -->
					{{{ end }}}
					{{{ if pagination }}}
						<!-- IMPORT partials/paginator.tpl -->
					{{{ end }}}
				</ul>
				{{{ if loadMore }}}
				<button type="button" data-page="{loadPage}" class="btn btn-info w-100 load-more">Load more</button>
				{{{ end }}}
			</div>
		</div>
	</div>
	<div class="col-lg-3 acp-sidebar">
		<div class="card">
			<div class="card-header">[[admin/advanced/events:filters]]</div>
			<div class="card-body">
				<form role="form" id="filters">
					<div class="mb-3">
						<label class="form-label" for="username">[[admin/manage/users:search.username]]</label>
						<input type="text" id="username" name="username" value="{query.username}" class="form-control" />
					</div>
					<div class="mb-3">
						<label class="form-label" for="uid">[[admin/manage/users:search.uid]]</label>
						<input type="text" id="uid" name="uid" value="{query.uid}" class="form-control" />
					</div>
					<div class="mb-3">
						<label class="form-label" for="email">[[admin/manage/users:search.email]]</label>
						<input type="text" id="email" name="email" value="{query.email}" class="form-control" />
					</div>
					<div class="mb-3">
						<label class="form-label" for="start">[[admin/advanced/events:filter-start]]</label>
						<input type="date" id="start" name="start" value="{query.start}" class="form-control" />
					</div>
					<div class="mb-3">
						<label class="form-label" for="end">[[admin/advanced/events:filter-end]]</label>
						<input type="date" id="end" name="end" value="{query.end}" class="form-control" />
					</div>
					<button type="submit" id="filter" class="btn btn-primary w-100">[[admin/advanced/events:filters-apply]]</button>
				</form>
			</div>
		</div>
	</div>
</div>
