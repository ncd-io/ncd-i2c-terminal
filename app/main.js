(function($){
	function addRow(type, data){
		var output;
		switch(type){
			case 'read':
				output = '<tr data-format="'+$('#input-format').val()+'"><td><span class="type" data-op="read">Read</span></td><td><span class="address">'+$('#address').val()+'</span></td><td><span class="register">'+$('#register').val()+'</span></td><td></td><td><span class="length">'+$('#read-length').val()+'</span></td><td><button class="resend">Resend</button></td></div>';
				//output = '<div class="read-command">Read '+len+': '+data.join(' ')+'</div>';
				break;
			case 'write':
				output = '<tr data-format="'+$('#input-format').val()+'"><td><span class="type" data-op="write">Write</span></td><td><span class="address">'+$('#address').val()+'</span></td><td><span class="register">'+$('#register').val()+'</td><td><span class="data">'+$('#input').val()+'</span></td><td></td><td><button class="resend">Resend</button></td></div>';

				//output = '<div><span class="type" data-op="write">Write</span> to <span class="address">'+$('#address').val()+'</span>  <span class="command">'+$('#input').val()+'</span></div>';

				//output = '<div class="write-command">Write: '+data.join(' ')+'</div>';
				break;
			case 'response':
				output = '<tr><td><span class="type">Response</span></td><td colspan="4">'+data.join(' ')+'</td></tr>';
				break;
			case 'error':
				output = '<tr><td><span class="type">Error</span></td><td colspan="4">'+JSON.stringify(data)+'</td></tr>';
				break;
		}
		$els = $(output);

		$('#results').append(output);

	}
	$(document).ready(function(){
		$('form#terminal').submit(function(e){
			addRow($('#command-type').val());
			$.ajax({
				type: 'post',
				url: 'ajax-submit',
				data: $(this).serialize()
			}).done(function(data){
				if(data.constructor == Array){
					addRow('response', data);
					//$('#results').text(data.join(' '));
				}else{
					addRow('error', data);
					//$('#results').text(JSON.stringify(data));
				}
			})
			return false;
		});
		$('#reload_comm').click(function(){
			$('#input-bus option').remove();
			$.getJSON('get-comms/'+$('#comm-type').val(), function(busses) {
				if (busses.length !== 0) {
					busses.forEach((bus) => {
						var option = $('<option/>',{
							'value': bus,
							'text': bus
						});
						option.appendTo('#input-bus');
					});
				}
			});
		});
		$('#reload_addr').click(function(){
			$('#address option').remove();
			$.getJSON('get-i2c/'+$('#comm-type').val()+'/'+encodeURIComponent($('#input-bus').val())+'/'+$('#input-port').val(), function(busses) {
				if (busses.length !== 0) {
					busses.forEach((bus) => {
						var option = $('<option/>',{
							'value': bus,
							'text': bus
						});
						option.appendTo('#address');
					});
				}
			});
		});
		$('#results').on('click', '.resend', function(){
			var row = $(this).closest('tr');
			var op = $('.type', row).data('op');
			$('#command-type option[value='+op+']').prop('selected', true);
			var addr = $('.address', row).data('op');
			$('#address option[value='+addr+']').prop('selected', true);
			$('#input-format option[value='+row.data('format')+']').prop('selected', true);
			if($('.register', row).length && $('.register', row).text().length){
				$('#register').val($('.register', row).text());
			}
			if($('.data', row).length && $('.data', row).text().length){
				$('#input').val($('.data', row).text());
			}
			if($('.length', row).length && $('.length', row).text().length){
				$('#read-length').val($('.length', row).text());
			}
			$('form#terminal').submit();
			return false;
		});
	})

})(jQuery);
