// #include <catch2/catch_session.hpp>
#include <iostream>
#include <memory>
#include <cstdlib>

#include "hotstuff/vm/counting_vm.h"

#include "hotstuff/config/replica_config.h"
#include "hotstuff/crypto/crypto_utils.h"
#include "hotstuff/manage_data_dirs.h"

#include "hotstuff/liveness.h"

#include <restbed>

using namespace std;
using namespace hotstuff;
using namespace restbed;

// use global variables to pass to handlers
std::string replica_id;
auto vm = std::make_shared<CountingVM>();;
NonspeculativeHotstuffApp<CountingVM>* app;


void get_method_handler( const shared_ptr< Session > session )
{
	const auto request = session->get_request( );

    int content_length = request->get_header( "Content-Length", 0 );

    session->fetch( content_length, [ ]( const shared_ptr< Session > session, const Bytes & body )
    {
		// getIndex...
		session->close( OK, "Hello, World!", { { "Content-Length", "13" } } );
	});
}

void post_method_handler( const shared_ptr< Session > session )
{
    const auto request = session->get_request( );

    int content_length = request->get_header( "Content-Length", 0 );

    session->fetch( content_length, [ ]( const shared_ptr< Session > session, const Bytes & body )
    {
        fprintf( stdout, "%.*s\n", ( int ) body.size( ), body.data( ) );
		if (stoi(replica_id) == 0) {
			PaceMakerWaitQC pmaker(*app);
			pmaker.set_self_as_proposer();
			auto proposal = xdr::opaque_vec<>(body.data(), body.data()+body.size());
			app->add_proposal(std::move(proposal));
			pmaker.do_propose();
			pmaker.wait_for_qc();

			std::cout << (vm->get_last_committed_height() == 0);
		}
		else {
			
		}
        session->close( OK, "Hello, World!", { { "Content-Length", "13" } } );
    } );
}


int main(int argc, char** argv)
{
	// BEGIN SETUP HOTSTUFF
	std::cout << "test";

	if (argc != 2) {
		std::cout << "Not enough arguments to instantiate replica";
		return 1;
	}

	replica_id = argv[1];
	std::string data_dir = "data_dir_" + replica_id;
	std::cout << replica_id << std::endl;
	std::cout << data_dir << std::endl;

	clear_all_data_dirs(data_dir);
	make_all_data_dirs(data_dir);

	auto [pk1, sk1] = deterministic_keypair_from_uint64(1);
	auto [pk2, sk2] = deterministic_keypair_from_uint64(2);
	auto [pk3, sk3] = deterministic_keypair_from_uint64(3);
	auto [pk4, sk4] = deterministic_keypair_from_uint64(4);
	ReplicaInfo r1(0, pk1, "localhost", "9000", "9001", "data_dir_0");
	ReplicaInfo r2(1, pk2, "localhost", "9002", "9003", "data_dir_1");
	ReplicaInfo r3(2, pk3, "localhost", "9004", "9005", "data_dir_2");
	ReplicaInfo r4(3, pk4, "localhost", "9006", "9007", "data_dir_3");

	ReplicaConfig config;
	config.add_replica(r1);
	config.add_replica(r2);
	config.add_replica(r3);
	config.add_replica(r4);

	config.finish_init();

	

	std::map<ReplicaID, SecretKey> m { 
		{0, sk1}, 
		{1, sk2}, 
		{2, sk3}, 
		{3, sk4}, 
	};

	// HotstuffApp app(config, r1.id, sk1, vm);
	
	app = new NonspeculativeHotstuffApp(config, stoi(replica_id), m[stoi(replica_id)], vm);

	app->init_clean();


	// END SETUP HOTSTUFF


	// BEING SETUP REST HANDLERS

    auto resource = make_shared< Resource >( );
    resource->set_path( "/resource" );
    resource->set_method_handler( "POST", post_method_handler );
	resource->set_method_handler( "GET", get_method_handler );
	std::cout << "Server loaded up" << std::endl;
    auto settings = make_shared< Settings >( );
    settings->set_port( 80 + stoi(replica_id) );
    settings->set_default_header( "Connection", "close" );

    Service service;
    service.publish( resource );
    service.start( settings );
	

	// int result = Catch::Session().run(argc, argv);
	
	return 0;
}
