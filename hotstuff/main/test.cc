// #include <catch2/catch_session.hpp>
#include <iostream>
#include <memory>
#include <cstdlib>
#include "hotstuff/vm/counting_vm.h"

#include "hotstuff/config/replica_config.h"
#include "hotstuff/crypto/crypto_utils.h"
#include "hotstuff/manage_data_dirs.h"

#include "hotstuff/liveness.h"
#include <typeinfo>
#include <restbed>

using namespace std;
using namespace hotstuff;
using namespace restbed;

// use global variables to pass to handlers
std::string replica_id;
auto vm = std::make_shared<CountingVM>();;
NonspeculativeHotstuffApp<CountingVM>* app;
std::vector<std::string> confirmed_hashes;

int getIndex(vector<std::string> v, std::string K)
{
    for (int i = 0; i < v.size(); i++)
    {
		if (v[i] == K)
		{
			return i;
		}
    }

	return -1;
}

void get_method_handler( const shared_ptr< Session > session )
{
	const auto request = session->get_request( );

    int content_length = request->get_header( "Content-Length", 0 );
	const auto query_parameters = request->get_query_parameters( );
	std::string hash = query_parameters.find( "hash" )->second;

    session->fetch( content_length, [hash]( const shared_ptr< Session > session, const Bytes & body )
    {
		// getIndex...
		printf( "%s\n", hash.c_str() );

		for(int i = 0; i < confirmed_hashes.size(); i++)
		{
    		std::cout << confirmed_hashes[i] << ' ';
		}

		int block_id = getIndex(confirmed_hashes, hash);
		std::string block_id_str = std::to_string(block_id);

		fprintf( stdout, "%.*s\n", ( int ) body.size( ), body.data( ) );
		session->close( OK, block_id_str, { { "Content-Length", std::to_string(block_id_str.length()) } } );
	});
}

void post_method_handler( const shared_ptr< Session > session )
{
    const auto request = session->get_request( );

    int content_length = request->get_header( "Content-Length", 0 );

    session->fetch( content_length, [ ]( const shared_ptr< Session > session, const Bytes & body )
    {
        fprintf( stdout, "%.*s\n", ( int ) body.size( ), body.data( ));
		std::cout << "TEST TEST" << std::endl;
		std::cout << body.data() << std::endl;
		const std::string hash_string( body.data( ), body.data( ) + body.size( ) );
		std::string hash_string_substr = hash_string.substr(10);
		hash_string_substr.pop_back();
		hash_string_substr.pop_back();
		std::cout << "HASH SUBSTR" << std::endl;
		std::cout << hash_string_substr << std::endl;

		// cout << typeid(body.data()).name() << endl;


		// std::string hash_string = body.data();
		std::cout << "TEST STRING" << std::endl;
		std::cout << hash_string_substr << std::endl;
		bool res;
		// HSC_INFO("HASH %s", hash_string);
		if (stoi(replica_id) == 0) {
			PaceMakerWaitQC pmaker(*app);
			pmaker.set_self_as_proposer();
			auto proposal = xdr::opaque_vec<>(body.data(), body.data()+body.size());
			app->add_proposal(std::move(proposal));
			pmaker.do_propose();
			res = pmaker.wait_for_qc();

			if (res)
			{
				confirmed_hashes.push_back(hash_string_substr);
			}

			std::cout << (vm->get_last_committed_height() == 0);
		}
		else {
			
		}
        session->close( OK, res ? "true" : "false", { { "Content-Length", res ? "4" : "5" } } );
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

    auto post_resource = make_shared< Resource >( );
    post_resource->set_path( "/append" );
    post_resource->set_method_handler( "POST", post_method_handler );

	auto get_resource = make_shared< Resource >( );
    get_resource->set_path( "/get_index" );
    get_resource->set_method_handler( "GET", get_method_handler );

	std::cout << "Server loaded up" << std::endl;
    auto settings = make_shared< Settings >( );
    settings->set_port( 80 + stoi(replica_id) );
    settings->set_default_header( "Connection", "close" );

    Service service;
    service.publish( post_resource );
	 service.publish( get_resource );
    service.start( settings );
	

	// int result = Catch::Session().run(argc, argv);
	
	return 0;
}
